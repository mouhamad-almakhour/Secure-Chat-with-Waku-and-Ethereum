#!/usr/bin /env node
import { Command } from "commander";
import { UserIdentity } from "./chat/identity.js";
import { sendMessage, receiveMessage, BroadcastePublicKey } from "./chat/messenger.js";

const program = new Command();

program
  .name("waku-chat")
  .description("Secure Group Chat using Waku Network")
  .version("1.0.0");

program
  .command("start-chat")
  .description("Start a chat session")
  .requiredOption("-k, --key <privateKey>", "Your Ethereum private key")
  .requiredOption("-r, --recipient <address>", "Recipient Ethereum address")
  .action(async (opts) => {
    const { key, recipient } = opts;

    // 1. Create identity
    const identity = await UserIdentity.createUser(key);

    // 2. Start receiver
    await receiveMessage(identity, key);

    // 3. Broadcast public key
    await BroadcastePublicKey(identity.address, identity.publicKey);
    console.log("📡 Broadcasted public key:", identity.publicKey);

    // 4. Chat loop
    console.log(`👤 Chat started as ${identity.address}`);
    console.log(`📨 Messages will be sent to ${recipient}`);
    console.log("Type a message and press Enter to send.\n");

    const readline = await import("readline");
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.on("line", async (input: string) => {
      await sendMessage(identity, recipient, input);
    });
  });


program.parseAsync(process.argv);
