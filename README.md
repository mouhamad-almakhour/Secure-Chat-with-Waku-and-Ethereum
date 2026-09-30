# Secure Chat with Waku Protocol

A TypeScript command-line chat client that sends signed, end-to-end encrypted messages over Waku. Ethereum wallets provide chat identity and message signatures. Creating an address is local and does not require an on-chain transaction.

## Requirements

- Node.js LTS and npm
- A reachable Ethereum JSON-RPC endpoint
- A wallet for each chat participant

## Setup

Install dependencies:

~~~bash
npm install
~~~

Create a .env file in the project root and set the Ethereum RPC URL used to read wallet/network information:

~~~dotenv
BLOCKCHAIN_NETWORK=https://your-ethereum-rpc-url
~~~

## Start a chat

Start the CLI directly from TypeScript:

~~~bash
npm run start-chat
~~~

On first use, choose to create a local wallet or import a private key. Imported keys are hidden while typing; an invalid key can be re-entered up to three times. A generated private key is shown once; back it up securely before continuing.

You can provide an existing key or recipient as options, though passing a private key on the command line can expose it in shell history or process listings:

~~~bash
npm run start-chat -- --key <PRIVATE_KEY> --recipient <RECIPIENT_ADDRESS>
~~~

## Local identities and aliases

When you create or import a wallet interactively, the CLI asks for an alias and saves the alias and address in secure-storage/identities.json. That file does not contain private keys.

On later runs, choose a saved identity by its alias. The CLI asks for its private key, hides the input, and checks that the key matches the selected address. You get up to three attempts; after that the CLI exits without changing the identity list. The key is not saved, so you must enter it again each time. The secure-storage directory is local to the working directory and is ignored by Git.

## Contact invites

The CLI displays your shareable contact invite when it starts. The invite contains your Ethereum address and public encryption key; it never contains your private key. Send it to the person you want to chat with.

Import the other person's invite when starting:

~~~bash
npm run start-chat -- --invite "<CONTACT_INVITE>"
~~~

You can also paste an invite when prompted. The CLI validates the invite and saves the contact's public key in secure-storage/contacts.json. The contact list is local to that machine. If you provide only a recipient address, its public key must already be saved or sending will report that you need the contact invite. Recipient addresses are checked for Ethereum format; an invalid value gets up to three attempts with a format hint, then the chat is cancelled.

After the other person starts their chat, type a message and press Enter to send it.

## Message flow

1. The sender signs the plaintext with their Ethereum wallet.
2. The sender encrypts the plaintext with the recipient's public encryption key.
3. The encrypted packet is sent over Waku.
4. The recipient decrypts the packet with their private key and verifies the sender's signature.

The message content is encrypted. Sender and recipient addresses, timestamps, and message type are visible in the packet.

## Deployment scope

This repository currently provides a CLI, not a browser application. The CLI receiver is a long-running process and is not deployed as a Vercel Function. A browser client is planned separately and is not included yet.

## Version

1.0.0
