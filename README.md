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


# Table of Contents
- [Prerequisites](#prerequisites)
- [CLI Command](#cli-command)
- [How It Works](#how-it-works)
- [Version](#version)

# Getting Started

## Prerequisites
Before you begin, ensure you have the following installed:

- Unix-based operating system (Linux, MacOS)
- [Node.js](https://nodejs.org/) (LTS version recommended)
- [Node Package Manager (npm)](https://www.npmjs.com/)
- Ethereum wallet private keys for testing multiple users

### Configuration: .env
1. Create the `.env` file from the sample:

```bash
- cp .env-sample .env
```
2. Fill the .env config file with the proper variables:
```bash
- BLOCKCHAIN_NETWORK=<Your Polygon RPC URL>
```

3. Install dependencies:
```bash
- npm install
```

4. Compile TypeScript to dist/
```bash
- npm run build
```

## CLI Command

Start a chat session for a user:
```bash
npm start -- start-chat -k <PRIVATE_KEY> -r <RECIPIENT_ADDRESS>
```

* -k, --key → Your Ethereum private key

* -r, --recipient → Ethereum address of the recipient

__Note__: The PRIVATE_KEY is required for signing and decrypting messages. Each user should have a different private key.

This command will create a user identity, start the receiver to listen for messages, broadcast your public key to the network, and open a CLI prompt for sending messages.

## How It Works

### Example:
```bash
Terminal 1 (User A):

- npm start -- start-chat -k 0xUSERA_PRIVATE_KEY -r 0xUSERA_ADDRESS
```

```bash
Terminal 2 (User B):

- npm start -- start-chat -k 0xUSERB_PRIVATE_KEY -r 0xUSERB_ADDRESS
```
- Messages typed in the terminal are sent to the recipient.

- Incoming messages are displayed automatically.

### Architecture / security flow
Ethereum Identity → Public-Key Discovery → Message Signing → ECIES Encryption → Waku Network → Decryption → Signature Verification

### Message Flow:
1. Sender signs the message with their Ethereum private key.

2. Sender encrypts the message using the recipient's public key (ECIES).

3. Sender broadcasts the encrypted message via the Waku network.

4. Recipient receives the message on their Waku subscription.

5. Recipient decrypts the message using their Ethereum private key.

6. Recipient verifies the signature to ensure authenticity.

### Public Key Broadcast

- Each user broadcasts their public key when starting the chat.

- Public keys are stored locally in src/publickeys/address.json.

- Other users retrieve the public key from storage to encrypt messages.

# Version
Version: v1.0.0

# License: 
Apache-2.0
