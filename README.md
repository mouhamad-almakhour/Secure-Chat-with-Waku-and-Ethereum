# Secure Decentralized Chat — Waku & Ethereum

Designed and implemented a secure, end-to-end encrypted messaging application using the Waku decentralized messaging protocol and Ethereum key pairs as cryptographic identities.

The application enables users to exchange messages securely without relying on a centralized messaging server. Each message is signed using the sender's Ethereum private key, encrypted with the recipient's public key using ECIES, and transmitted through the Waku network. The recipient decrypts the message with their private key and verifies the sender's signature to ensure authenticity and integrity.


## Key technical work
- Implemented Ethereum-based cryptographic identities for users.
- Implemented message signing and signature verification.
- Implemented ECIES public-key encryption for end-to-end message confidentiality.
- Integrated the Waku decentralized messaging protocol for message transport.
- Implemented public-key discovery and broadcasting between users.
- Built the messaging workflow as a TypeScript CLI application.
- Designed the message lifecycle from identity creation and key discovery through encryption, decentralized transmission, decryption and authentication.
- Integrated Polygon network configuration through an RPC endpoint for the Web3 environment.

__Technologies__: TypeScript · Node.js · Ethereum · Waku · Web3 · Cryptography · ECIES · Digital Signatures · Public-Key Cryptography · Polygon · CLI

__Type__: Personal R&D / Independent Project

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

### Architecture / security flow
Ethereum Identity → Public-Key Discovery → Message Signing → ECIES Encryption → Waku Network → Decryption → Signature Verification

### Message Flow:
1. Sender signs the message with their Ethereum private key.

After the other person starts their chat, type a message and press Enter to send it.

## Message flow

1. The sender signs the plaintext with their Ethereum wallet.
2. The sender encrypts the plaintext with the recipient's public encryption key.
3. The encrypted packet is sent over Waku.
4. The recipient decrypts the packet with their private key and verifies the sender's signature.

The message content is encrypted. Sender and recipient addresses, timestamps, and message type are visible in the packet.

## Deployment scope

This repository provides a CLI and a local browser application in `ui/`. The CLI receiver is a long-running process and is not deployed as a Vercel Function. The UI runs locally using Vite and connects directly to Waku; a public hosted deployment and native desktop installers are not included.

## Version

- Public keys are stored locally in src/publickeys/address.json.

- Other users retrieve the public key from storage to encrypt messages.

# Version
Version: v1.0.0

# License: 
Apache-2.0

## Local graphical application

The React + Vite application lives in [ui](ui/README.md). Run `cd ui`, `npm install`, and `npm run dev`, then open the printed localhost URL. It supports local identity creation/import, CLI-compatible contact invites, encrypted messaging over Waku, and light/dark/system appearance.

### Security protocol update

Both peers must use this updated CLI/UI. Messages use v2 encrypted signed envelopes; legacy message packets and unsigned key broadcasts are rejected. Public v1 contact invites still work, including one-invite replies. Routing addresses and timestamps remain visible. Incoming messages expire after 24 hours (five minutes of future clock tolerance). Replay tracking lasts for the unlocked session and rejects further new messages when its 10,000-ID cache is full; reconnecting does not reset it in the UI. Restarting/unlocking resets replay protection. UI history retains the latest 500 messages and at most 20 pending requests. Use dedicated chat identities: this ECIES design has no forward secrecy. CLI key arguments are disabled; key setup requires an interactive terminal. Explicit backup reveal remains visible to terminal recordings.
