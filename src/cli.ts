#!/usr/bin /env node
import { Command } from "commander";
import { createInterface } from "node:readline";
import { ethers } from "ethers";
import { UserIdentity } from "./chat/identity.js";
import { sendMessage, receiveMessage, BroadcastePublicKey } from "./chat/messenger.js";
import { createContactInvite, parseContactInvite } from "./chat/invites.js";
import { storePublicKey } from "./utility/publickeys.js";
import { listLocalIdentities, saveLocalIdentity } from "./utility/identities.js";


const program = new Command();

let sharedPrompt: ReturnType<typeof createInterface> | undefined;

function getPrompt(): ReturnType<typeof createInterface> {
  if (!sharedPrompt) {
    sharedPrompt = createInterface({ input: process.stdin, output: process.stdout });
  }
  return sharedPrompt;
}

function ask(question: string, hidden = false): Promise<string> {
  const prompt = getPrompt();
  const mutablePrompt = prompt as unknown as { _writeToOutput: (value: string) => void };
  const originalWrite = mutablePrompt._writeToOutput.bind(prompt);

  if (hidden) {
    mutablePrompt._writeToOutput = (value: string) => {
      if (value === question || value.includes("\n")) process.stdout.write(value);
    };
  }

  return new Promise((resolve) => {
    prompt.question(question, (answer) => {
      if (hidden) {
        mutablePrompt._writeToOutput = originalWrite;
        process.stdout.write("\n");
      }
      resolve(answer.trim());
    });
  });
}

async function promptForPrivateKey(expectedAddress?: string): Promise<string | null> {
  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const privateKey = await ask("Enter your private key (input hidden): ", true);
    let wallet: ethers.Wallet;

    try {
      wallet = new ethers.Wallet(privateKey);
    } catch {
      console.error(
        `Invalid private key. Try again (${attempt}/${maxAttempts}).`,
      );
      continue;
    }

    if (expectedAddress && wallet.address.toLowerCase() !== expectedAddress.toLowerCase()) {
      console.error(
        `That key does not match the selected address. Try again (${attempt}/${maxAttempts}).`,
      );
      continue;
    }

    return wallet.privateKey;
  }

  console.error("Three attempts used. No identity was changed; run npm run start-chat to try again.");
  return null;
}

async function getPrivateKey(providedKey?: string): Promise<string | null> {
  if (providedKey) {
    try {
      return new ethers.Wallet(providedKey).privateKey;
    } catch {
      console.error("The --key value is not a valid private key. Omit --key to enter it interactively.");
      return null;
    }
  }

  const savedIdentities = listLocalIdentities();
  if (savedIdentities.length > 0) {
    console.log("\nSaved local identities:");
    savedIdentities.forEach((identity, index) => {
      console.log(`  ${index + 1}. ${identity.alias} — ${identity.address}`);
    });

    const selection = (await ask('Choose an identity number, or type "new" to add one: '))
      .toLowerCase();

    if (selection !== "new" && selection !== "n") {
      const selectedIndex = Number(selection) - 1;
      if (!Number.isInteger(selectedIndex) || !savedIdentities[selectedIndex]) {
        console.error('Select a listed number or type "new".');
        return null;
      }

      return promptForPrivateKey(savedIdentities[selectedIndex].address);
    }
  }

  const setupChoice = (await ask("Create a new local wallet or import a private key? [create/import]: "))
    .toLowerCase();
  let address: string;
  let savedPrivateKey: string;

  if (setupChoice === "create") {
    const wallet = ethers.Wallet.createRandom();
    address = wallet.address;
    savedPrivateKey = wallet.privateKey;
    console.log("\nNew wallet created locally.");
    console.log(`Address: ${address}`);
    console.log("Back up this private key somewhere safe. It cannot be recovered if lost:");
    console.log(savedPrivateKey);
    await ask("Press Enter after you have safely backed up the private key: ");
  } else if (setupChoice === "import") {
    const privateKey = await promptForPrivateKey();
    if (!privateKey) return null;
    const wallet = new ethers.Wallet(privateKey);
    address = wallet.address;
    savedPrivateKey = wallet.privateKey;
  } else {
    console.error('Choose "create" or "import" to set up a wallet.');
    return null;
  }

  const defaultAlias = `Wallet ${listLocalIdentities().length + 1}`;
  const alias = (await ask(`Choose a name for this address [${defaultAlias}]: `)) || defaultAlias;
  saveLocalIdentity(address, alias);
  console.log(`Saved ${alias} and ${address} locally. The private key was not saved.`);
  return savedPrivateKey;
}


async function promptForRecipientAddress(initialValue?: string): Promise<string | null> {
  const maxAttempts = 3;
  let candidate = initialValue;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    if (!candidate) {
      candidate = await ask("Recipient Ethereum address (0x followed by 40 hex characters): ");
    }

    if (ethers.isAddress(candidate)) {
      return ethers.getAddress(candidate);
    }

    console.error(
      `Invalid Ethereum address format. Use 0x followed by 40 hex characters. Try again (${attempt}/${maxAttempts}).`,
    );
    candidate = undefined;
  }

  console.error("Three invalid address attempts. Chat cancelled.");
  return null;
}

program
  .name("waku-chat")
  .description("Secure Group Chat using Waku Network")
  .version("1.0.0");

program
  .command("start-chat")
  .description("Start a chat session")
  .option("-k, --key <privateKey>", "Existing Ethereum private key (interactive setup is safer)")
  .option("-r, --recipient <address>", "Recipient Ethereum address")
  .option("-i, --invite <contactInvite>", "Recipient Waku Chat contact invite")
  .action(async (opts) => {
    const key = await getPrivateKey(opts.key);
    if (!key) {
      sharedPrompt?.close();
      return;
    }

    // 1. Create identity
    const identity = await UserIdentity.createUser(key);
    const ownInvite = createContactInvite(identity.address, identity.publicKey);
    console.log("\nShare this contact invite with the person you want to chat with:");
    console.log(ownInvite);

    let inviteInput: string | undefined = opts.invite;
    let recipient: string | undefined = opts.recipient;

    if (!inviteInput && !recipient) {
      const contactInput = await ask("Paste a contact invite or enter a saved contact address: ");
      if (contactInput.startsWith("waku-chat://invite/")) {
        inviteInput = contactInput;
      } else {
        recipient = contactInput;
      }
    }

    if (inviteInput) {
      let contact;
      try {
        contact = parseContactInvite(inviteInput);
      } catch (error) {
        console.error(error instanceof Error ? error.message : "Contact invite is invalid.");
        sharedPrompt?.close();
        return;
      }

      if (recipient && !ethers.isAddress(recipient)) {
        recipient = await promptForRecipientAddress(recipient) ?? undefined;
        if (!recipient) {
          sharedPrompt?.close();
          return;
        }
      }

      if (recipient && ethers.getAddress(recipient) !== contact.address) {
        console.error("The recipient address does not match the imported contact invite.");
        sharedPrompt?.close();
        return;
      }

      await storePublicKey(contact.address, contact.publicKey);
      recipient = contact.address;
      console.log(`Saved contact invite for ${contact.address}.`);
    } else {
      recipient = await promptForRecipientAddress(recipient) ?? undefined;
      if (!recipient) {
        sharedPrompt?.close();
        return;
      }
    }

    // 2. Start receiver
    await receiveMessage(identity, key);

    // 3. Broadcast public key
    await BroadcastePublicKey(identity.address, identity.publicKey);
    console.log("📡 Broadcasted public key:", identity.publicKey);

    // 4. Chat loop
    console.log(`👤 Chat started as ${identity.address}`);
    console.log(`📨 Messages will be sent to ${recipient}`);
    console.log("Type a message and press Enter to send.\n");

    const rl = getPrompt();
    rl.on("line", async (input: string) => {
      await sendMessage(identity, recipient, input);
    });
  });


program.parseAsync(process.argv);
