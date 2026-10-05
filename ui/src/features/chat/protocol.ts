import {
  encodeSecureMessage,
  decodeSecureMessage,
} from "../../../../src/chat/protocol";
import type { Identity, Contact } from "../../shared/types";
export { Packet, MessageGuard } from "../../../../src/chat/protocol";
export function encodeMessage(
  identity: Identity,
  contact: Contact,
  text: string,
  timestamp = Date.now(),
) {
  return encodeSecureMessage(identity.wallet, contact, text, timestamp);
}
export function decodeMessage(identity: Identity, payload: Uint8Array) {
  return decodeSecureMessage(
    identity.wallet.address,
    identity.wallet.privateKey,
    payload,
  );
}
