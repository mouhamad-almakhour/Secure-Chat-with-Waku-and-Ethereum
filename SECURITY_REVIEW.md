# Remediation status — 2026-10-05

Implemented in CLI and UI:

- Shared v2 protocol encrypts the signature and signs a domain-separated sender/recipient/timestamp/random-ID/content envelope. Rejects legacy packets, forged metadata, invalid dates, stale packets, and oversized content. Sender key recovery preserves one-invite replies.
- CLI invite creation/parsing and contact saving/loading verify address/key binding. Invalid signatures never reach plaintext display. Unsigned public-key announcements are removed.
- Session replay cache holds up to 10,000 IDs and fails closed when full. Ingress is limited to 20 packets/second before decryption. UI holds 500 messages, 20 pending requests, and 1,000 ignored senders. These limits reduce application-level flooding; they do not prevent network-level denial of service.
- Removed unused private-key settings from local .env and restricted its mode to 0600. No key values were logged. No rotation was performed; removal cannot revoke previously copied keys.
- CLI rejects --key and requires a TTY. New-key backup requires explicit reveal; terminal recording/scrollback still captures intentionally revealed keys. Wallet helper errors are generic. Incoming terminal text is JSON escaped.
- Awaited sending and subscription, added send cleanup and readiness timeout. Drafts survive screen changes and are cleared after successful sending only if their current content equals the submitted draft.
- Removed unused root dependency chains, including legacy js-waku, and refreshed the root lockfile with protobufjs >=7.6.6. Existing node_modules has an ownership conflict preventing a full in-place install; build/test evidence used the existing install. Fresh installation is still required to exercise the updated lockfile.

Remaining limitations: no forward secrecy; no persistent replay cache across restarts/unlocks; both refreshed lockfiles retain six audit findings (four high, two moderate), from peer-store/uuid and their Waku/libp2p dependency propagation; npm suggests a breaking SDK downgrade, which was not applied; no real-peer/browser end-to-end verification in this remediation. Keys remain in JavaScript memory while unlocked. A dedicated chat identity is recommended. Neither local key removal nor the code changes establish that previous keys were never disclosed.

Validation: root TypeScript build, UI production build, and security protocol regression suite, including Unicode, one-invite replies, ciphertext tampering, hidden signatures, authenticated timestamps, recipient re-encryption rejection, invite binding, duplicate-ID rejection and ingress limits. A jsdom React integration check with mocked Waku transport passed encrypted one-invite replies, public-only persistence, drafts surviving navigation and delayed send acknowledgement, theme changes, and locking. Real Chromium/real-peer coverage remains outstanding.

The original findings below are retained as historical audit evidence; line numbers and counts describe the pre-remediation snapshot.

---

# Security review — MA Secure Chat

Date: 2026-10-05. Scope: current CLI sources in `src/`, browser sources/configuration in `ui/`, dependency lockfiles, current local storage permissions, and tracked files. This is a source review with local reproductions, not a penetration test or certification. The original audit was read-only; the remediation below subsequently changed code and removed unused local secret settings. No private-key values were printed or sent to an external service.

## Findings requiring remediation

### High — public plaintext signatures allow offline message guessing

Locations: `src/chat/messenger.ts:21`, `src/chat/messenger.ts:34`, `ui/src/features/chat/protocol.ts:27`, `ui/src/features/chat/protocol.ts:37`.

Both clients sign the plaintext and publish the signature and sender address outside the encrypted ciphertext. An observer can try candidate messages and use `verifyMessage(candidate, signature) === from` to identify the right guess. This defeats confidentiality for predictable messages such as “yes”, “no”, short codes, or known phrases. It does not reveal the private key or arbitrarily decrypt high-entropy messages.

Verified locally: the observer identified a test message from a three-item dictionary using only the public signature and address, without the recipient key or ciphertext decryption.

Remediation: encrypt the signature together with the plaintext in a versioned inner envelope. Sign a domain-separated envelope containing sender, recipient, message ID, timestamp, and content. Sender public-key recovery can still occur after decryption and verification, preserving the one-invite UX. Update CLI and UI together; do not silently weaken verification to maintain legacy compatibility.

Reference: https://docs.ethers.org/v6/api/hashing/

### High — CLI accepts an encryption key that does not belong to the claimed contact

Locations: `src/chat/invites.ts:63`, `src/utility/publickeys.ts:50`.

The CLI validates addresses and public keys independently without checking `computeAddress(publicKey) === address`. A replaced invite can claim a trusted recipient address while supplying an attacker's key. Messages are then encrypted for the attacker, who can observe the shared Waku topic and decrypt them.

Verified locally: the CLI accepted a mismatched invite and a message encrypted to its key was decrypted with the attacker's test key. The UI correctly rejected that same invite.

Remediation: enforce the address/key binding when parsing invites, creating invites, saving contacts, and loading existing CLI contacts. Revalidate existing saved contacts. This verifies cryptographic identity ownership; users still need a trusted way to associate an address with a person.

### High — CLI displays messages after signature verification fails

Location: `src/waku-client/receive.ts:64`.

The mismatch branch prints an error but execution continues into `onMessageReceived(fullMessage)`, which prints the decrypted content and claimed sender. Someone with the recipient public key can encrypt a forged message, attach their own signature, and claim another sender.

Verified with the real receiver code and a mocked network: signature failure was reported and the same unverified plaintext was emitted by the receive handler.

Remediation: return or throw on verification failure before any plaintext display or downstream processing. Compare normalized addresses and validate packet fields and sizes before decryption. Add a regression test for the CLI receiver; the existing UI correctly rejects sender/signature mismatches.

### High — two private-key-format values are present in local .env

Location: local `.env` (untracked; secret values intentionally withheld).

The file contains two settings with private-key-like names and 64-hex values. Its permission mode is `0644`, allowing group/other reads at the file level. The home directory is `0750`, so actual access also depends on parent traversal permissions and group membership. The file is Git-ignored and currently untracked. The reviewed application reads `BLOCKCHAIN_NETWORK`; no use of these private-key settings was found in current source.

Remediation: remove unused key settings, restrict any retained secret file to `0600`, and review who could access copies, backups, or prior sharing. Rotate identities if the keys have been disclosed. This review does not establish a breach, prove these values are funded wallets, or scan Git history for prior secrets.

### High — vulnerable dependency chains remain

Locations: root `package-lock.json`, `ui/package-lock.json`.

Fresh `npm audit` results:

| Project | Critical | High | Moderate | Low | Total flagged packages |
| --- | ---: | ---: | ---: | ---: | ---: |
| CLI | 1 | 22 | 11 | 1 | 35 |
| UI | 0 | 4 | 2 | 0 | 6 |

The CLI has a critical `protobufjs` advisory group. Both dependency trees include the `@libp2p/peer-store` peer-record validation advisory; the UI findings also include an outdated uuid chain. Counts include transitive propagation and are not counts of independently exploitable application flaws. Schema-related protobuf code-execution advisories are not established as reachable through this app's fixed packet schema; reachability must be evaluated before making remote-execution claims.

Remediation: update/remove obsolete direct dependencies, especially unused legacy `js-waku`, select a patched supported networking stack, and rerun compatibility and wire-protocol tests. Do not run `npm audit fix --force` blindly.

References: https://github.com/advisories/GHSA-vrf4-mx87-p53w and https://github.com/advisories/GHSA-xq3m-2v4x-88gg

### Medium — unsigned metadata enables timestamp tampering and replay

Locations: `ui/src/features/chat/protocol.ts:27`, `ui/src/features/chat/protocol.ts:71`, `ui/src/App.tsx:97`, `src/chat/messenger.ts:28`.

Only the plaintext is signed; packet metadata is neither signed nor part of the encrypted envelope. The UI deduplicates using a hash of the whole packet. An observer can change the timestamp while retaining the ciphertext and signature, producing another hash for a still-accepted message. Replay records are also session-only.

Verified locally: an altered timestamp passed verification and generated a different message ID for identical plaintext. There is no automatic transaction execution in this app, but the UI can show a replay as a fresh message.

Remediation: authenticate metadata inside the encrypted signed envelope, use a signed random message ID, compare routing metadata with authenticated fields, and define bounded replay tracking across sessions and expiry behavior.

### Medium — generated CLI private keys enter stdout and scrollback

Locations: `src/cli.ts:118`, `src/cli.ts:170`.

The backup step intentionally prints the generated private key to stdout. Redirected logs, session recordings, and terminal scrollback can retain it. The `--key` argument additionally places a supplied key in shell history and process arguments. Interactive imported keys are hidden, and validation errors in the main CLI prompt are generic.

Remediation: avoid accepting secrets in command-line arguments; prefer hidden interactive input or a deliberately designed secure key source. Require a TTY for interactive backup, avoid logging the key through normal stdout, and make reveal explicit. Terminal clearing alone cannot erase recordings or captured output.

### Medium — wallet helper can propagate secret-bearing validation errors

Location: `src/web3-connect/eth.ts:44`.

`connectWithPrivateKey` includes the original ethers error message in its thrown error. Invalid-key exceptions can contain the supplied value. Verified using a synthetic marker, not a real secret. The main CLI validates keys before this helper, which reduces reachability in the normal CLI path; direct/helper callers remain exposed.

Remediation: emit a generic key-validation error and never include raw input or secret-bearing cause objects in logs, UI messages, or telemetry.

### Medium — request/message storage and CLI decoding lack resource bounds

Locations: `ui/src/App.tsx:88`, `ui/src/App.tsx:97`, `src/waku-client/receive.ts:36`.

The UI limits an individual packet and plaintext but accumulates unbounded message and contact-request arrays. A sender can generate valid identities and flood requests; there is no request limit or rate limiting. The CLI lacks the UI's packet/message limits and replay deduplication. This can exhaust memory or responsiveness.

Remediation: bound queues and history, limit requests/messages per sender and session, cap decoder input before parsing, and apply backpressure and explicit retry/recovery behavior. Discard or quarantine malformed packets without dumping full errors/payloads.

### Medium — long-term identity keys also decrypt historical traffic

Locations: `ui/src/features/chat/protocol.ts:61`, `src/waku-client/receive.ts:60`.

The wallet identity key is the long-term ECIES recipient key. Compromising it allows decryption of previously recorded incoming ciphertexts. There is no key ratchet or forward secrecy; compromise of a funded identity would also affect the wallet itself.

Remediation: use dedicated messaging identities for local trials. For stronger security, adopt an audited session/key-ratcheting protocol and separate wallet authentication from messaging decryption keys. This requires a protocol redesign, not just a storage change.

Reference: https://cheatsheetseries.owasp.org/cheatsheets/Key_Management_Cheat_Sheet.html

## Additional observations

- CLI plaintext is written directly to the terminal. Untrusted ANSI/control characters can manipulate terminal presentation. Render safe text without terminal escape sequences; keep diagnostic logs separate from user messages.
- The CLI public-key broadcast uses `signature: "No"`; the receiver displays it as “Stored public key” but does not actually save it. No current automatic contact-store poisoning through that branch was found. Authenticate broadcasts and enforce address/key binding before adding any automatic storage behavior.
- `src/chat/messenger.ts:38` does not await `startSender`. The input callback also lacks error handling. Send failures can produce unhandled rejections, and failure cleanup can retain networking resources. Await sends and stop nodes in `finally`.
- Private keys are retained in browser wallet/React memory while unlocked, and the UI intentionally shows the generated key in the backup dialog. Any already-compromised same-origin script, powerful browser extension, or debugger can access session secrets. Memory-only storage does not establish hardware isolation or reliable zeroization.
- No production CSP is configured in this local Vite application. I found no `dangerouslySetInnerHTML`/eval-based rendering of message content or demonstrated UI XSS; React renders user text as text. Configure and verify a deployment-appropriate CSP when hosting.

## Controls that are working

- UI identity persistence only saves name/address; contacts save public keys. Current CLI identity/contact files contain no private-key-named fields and are mode `0600`.
- Contact invites contain public details, not private keys.
- The UI validates invite address/key binding and rejects tampered ciphertext or mismatched message signatures before contact discovery.
- Sender encryption keys are recovered from verified signatures, not from an unauthenticated supplied field.
- UI private-key validation messages are generic. No application telemetry or explicit private-key network transmission was found in the reviewed source.
- Vite binds to localhost by default. `.env` and `secure-storage/` are ignored by Git; no obvious static 64-hex secret literals were found in tracked text files by the current scan. This does not cover Git history or all possible secret encodings.

## Verification and limits

Nine existing protocol tests passed. Additional local reproductions confirmed signature guessing, timestamp replay, CLI invite substitution, secret-bearing ethers errors, and CLI delivery of unverified plaintext. Mocking was limited to networking/wallet wiring for the CLI receive-handler test; encryption and signature checks used real test keys. No user private keys were printed.

No live Waku interception, dependency-exploit attempt, browser extension assessment, full Git-history secret audit, or production deployment review was performed. The current tests passing does not make the application ready for public distribution: several tests intentionally preserve the vulnerable CLI-compatible protocol.

Recommended order: secure/remove local key material; reject unverified CLI messages and mismatched keys; introduce an encrypted signed envelope in both clients while retaining one-invite discovery; address replay/resource limits; remediate dependency chains; then verify with real peers and review the hosted deployment separately.
