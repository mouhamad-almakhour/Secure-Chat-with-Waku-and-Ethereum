import { WakuClient } from "./waku.js";
import { UserIdentity } from "../chat/identity.js";
import { decodeSecureMessage, MessageGuard } from "../chat/protocol.js";
import { storePublicKey } from "../utility/publickeys.js";
export { Packet as DataPacket } from "../chat/protocol.js";
export async function startReceiver(
  recipient: UserIdentity,
  privateKey: string,
): Promise<void> {
  const waku = new WakuClient();
  const guard = new MessageGuard();
  await waku.initialize();
  await waku.subscribeToMessages((packet: { payload?: Uint8Array }) => {
    if (!packet.payload || !guard.allowPacket()) return;
    try {
      const message = decodeSecureMessage(
        recipient.address,
        privateKey,
        packet.payload,
      );
      if (!message || !guard.accept(message.id)) return;
      // Recovery occurs only after authenticated decryption, enabling one invite.
      void storePublicKey(message.from, message.senderPublicKey).catch(() =>
        console.error("Could not save verified contact."),
      );
      console.log(
        `Message from ${message.from}: ${JSON.stringify(message.text)}`,
      );
    } catch {
      console.error("Rejected malformed or unverified message.");
    }
  });
}
