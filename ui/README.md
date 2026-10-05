# MA secure chat

A local React + Vite client for the existing Waku secure chat project. It connects directly to Waku from your browser; there is no messaging application server.

## Run locally

Requires Node.js 22.12 or newer and npm.

```bash
cd ui
npm install
npm run dev
```

Open the localhost URL printed by Vite (normally http://127.0.0.1:5173). Keep that terminal running while using the app. This is the local browser application; native desktop installers are not included.

## Try a conversation

1. Create an identity and back up the displayed private key, or import an existing chat identity.
2. Copy your contact invite from **Exchange invites**.
3. Share just one invite with the other person through a trusted channel. They run the app on their machine and import that invite. For testing on one machine, use separate browser profiles so public identity/contact storage remains separate.
4. The person who imports the invite names the contact and sends the first message. The invite owner receives a verified contact request, names the sender, and chooses **Accept and open chat**. No second invite is needed.
5. Both users must show **Connected to Waku** before the first message is sent. The invite owner can reply after accepting the request.

The UI uses the CLI's protobuf packet format, ECIES encryption, Ethereum message signatures, content topic, and routing configuration. Existing CLI contact invites work in both directions. The browser recovers the sender’s public encryption key from the first verified message signature. Requests are only created after decryption and signature verification. Dismissing a request ignores that sender for the current session. The browser additionally validates that an invite's public key matches its address.

**Accepted by Waku** means a peer accepted the message. It does not confirm recipient delivery. Offline retrieval, read receipts, push notifications, and persistent message history are not implemented.

## Local storage and privacy

Private keys exist only in session memory and are never saved to localStorage or sent to an application server. Reloading or locking the UI requires entering your private key again. Identity names, public addresses, contacts and theme preferences are saved in browser storage. Message history exists only in memory and is cleared when locking, reloading, or closing the application.

Message content is encrypted. Addresses, timestamps, message types and signatures are visible in network packets. The current CLI-compatible signature covers the plaintext, not the packet metadata. Never use a funded wallet for local chat testing; create a dedicated identity.

The Waku connection has a peer discovery timeout and a manual reconnect action. Public bootstrap peers must be reachable over browser-compatible transports; their availability is outside the UI's control. Sending and receiving over public peers must be verified in a real browser before distributing this client.

## Appearance and accessibility

Light, dark and system appearance; system changes apply live. Theme selection persists. The responsive chat shows a conversation list on narrow screens with explicit back navigation. Forms have labels and validation feedback; native dialogs support Escape and restore focus. The interface respects reduced motion.

## Checks

```bash
npm test
npm run build
npm run preview
```

Tests cover encrypted messages, signature validation, tampering, repeated messages, malformed invites, CLI invite compatibility, and a complete encrypted one-invite exchange. Browser layout verification requires a Chromium installation with its system libraries.

## Dependency status

The Waku SDK is pinned to the existing CLI's version for API compatibility. Its libp2p/peer-store and uuid dependency chains currently have npm security advisories. No forced incompatible dependency overrides are applied. This local trial needs dependency remediation and real-peer testing before public distribution.

Security update: this UI and the CLI now require message protocol v2; both peers must update. Existing v1 public invites remain valid. See the root SECURITY_REVIEW.md for fixed findings and remaining limitations. Drafts remain session-local, history is capped at 500 messages, and pending requests at 20.
