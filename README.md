# Secure Chat with Waku Protocol

This project is a secure, end-to-end encrypted chat application using the **Waku network** and Ethereum key pairs. Users can send and receive messages securely, sign messages, and broadcast their public keys for encryption.

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