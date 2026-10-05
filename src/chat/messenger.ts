import { UserIdentity } from "./identity.js";
import { startSender } from "../waku-client/send.js";
import { startReceiver } from "../waku-client/receive.js";
import { storePublicKey, getPublicKey } from "../utility/publickeys.js";
import { encodeSecureMessage } from "./protocol.js";
export async function sendMessage(
  sender: UserIdentity,
  recipientAddress: string,
  plaintext: string,
) {
  const publicKey = getPublicKey(recipientAddress);
  if (!publicKey) throw Error("Import the recipient contact invite first.");
  await startSender(
    await encodeSecureMessage(
      sender,
      { address: recipientAddress, publicKey },
      plaintext,
    ),
  );
}
// Retained for CLI compatibility; unauthenticated network broadcasts are removed.
export async function BroadcastePublicKey(address: string, publicKey: string) {
  await storePublicKey(address, publicKey);
}
export async function receiveMessage(
  recipient: UserIdentity,
  privateKey: string,
) {
  await startReceiver(recipient, privateKey);
}
