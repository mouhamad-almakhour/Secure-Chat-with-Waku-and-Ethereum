import protobuf from "protobufjs";
import { decrypt, encrypt } from "eciesjs";
import {
  getAddress,
  computeAddress,
  randomBytes,
  hexlify,
  verifyMessage,
  SigningKey,
  hashMessage,
} from "ethers";

export const Packet = new protobuf.Type("DataPacket")
  .add(new protobuf.Field("timestamp", 1, "uint64"))
  .add(new protobuf.Field("from", 2, "string"))
  .add(new protobuf.Field("to", 3, "string"))
  .add(new protobuf.Field("message", 4, "string"))
  .add(new protobuf.Field("type", 5, "string"))
  .add(new protobuf.Field("signature", 6, "string"));
const MAX_AGE = 24 * 60 * 60 * 1000;
interface Body {
  version: 2;
  id: string;
  from: string;
  to: string;
  timestamp: number;
  text: string;
}
function canonical(b: Body): string {
  return JSON.stringify([
    "MA Secure Chat/message/v2",
    b.id,
    b.from,
    b.to,
    b.timestamp,
    b.text,
  ]);
}
function validTime(timestamp: number, now: number): boolean {
  return (
    Number.isSafeInteger(timestamp) &&
    timestamp >= 0 &&
    timestamp <= 8640000000000000 &&
    timestamp >= now - MAX_AGE &&
    timestamp <= now + 300000
  );
}
export async function encodeSecureMessage(
  signer: { address: string; signMessage(text: string): Promise<string> },
  contact: { address: string; publicKey: string },
  text: string,
  timestamp = Date.now(),
): Promise<Uint8Array> {
  if (!text.trim() || text.length > 4000 || !validTime(timestamp, Date.now()))
    throw Error("Invalid message content or timestamp.");
  const to = getAddress(contact.address);
  if (computeAddress(contact.publicKey) !== to)
    throw Error("Contact key does not match its address.");
  const body: Body = {
    version: 2,
    id: hexlify(randomBytes(32)),
    from: getAddress(signer.address),
    to,
    timestamp,
    text,
  };
  const signature = await signer.signMessage(canonical(body));
  const message = encrypt(
    contact.publicKey,
    Buffer.from(JSON.stringify({ ...body, signature }), "utf8"),
  ).toString("base64");
  return Packet.encode(
    Packet.create({
      timestamp,
      from: body.from,
      to,
      message,
      type: "NORMAL_V2",
    }),
  ).finish();
}
export function decodeSecureMessage(
  address: string,
  privateKey: string,
  payload: Uint8Array,
  now = Date.now(),
) {
  if (payload.length > 64000) return null;
  const raw = Packet.toObject(Packet.decode(payload), {
    longs: Number,
  }) as Record<string, unknown>;
  if (
    raw.type !== "NORMAL_V2" ||
    typeof raw.to !== "string" ||
    typeof raw.from !== "string" ||
    typeof raw.message !== "string" ||
    raw.signature ||
    typeof raw.timestamp !== "number" ||
    !validTime(raw.timestamp, now)
  )
    return null;
  const to = getAddress(address);
  if (getAddress(raw.to) !== to) return null;
  const b = JSON.parse(
    decrypt(privateKey, Buffer.from(raw.message, "base64")).toString("utf8"),
  );
  if (
    b.version !== 2 ||
    typeof b.id !== "string" ||
    !/^0x[0-9a-f]{64}$/.test(b.id) ||
    typeof b.text !== "string" ||
    !b.text.trim() ||
    b.text.length > 4000 ||
    typeof b.signature !== "string" ||
    b.from !== getAddress(raw.from) ||
    b.to !== to ||
    b.timestamp !== raw.timestamp
  )
    throw Error("Invalid authenticated message.");
  const signed = canonical(b);
  if (verifyMessage(signed, b.signature) !== b.from)
    throw Error("Message signature could not be verified.");
  return {
    id: b.id,
    from: b.from as string,
    to,
    text: b.text as string,
    timestamp: b.timestamp as number,
    senderPublicKey: SigningKey.recoverPublicKey(
      hashMessage(signed),
      b.signature,
    ),
    status: "received" as const,
  };
}
/** Bounded session replay tracking and ingress budget; independent of displayed history. */
export class MessageGuard {
  private ids = new Map<string, number>();
  private window = 0;
  private count = 0;
  allowPacket(now = Date.now()): boolean {
    if (now - this.window >= 1000) {
      this.window = now;
      this.count = 0;
    }
    return ++this.count <= 20;
  }
  accept(id: string, now = Date.now()): boolean {
    for (const [key, time] of this.ids) {
      if (now - time > MAX_AGE) this.ids.delete(key);
      else break;
    }
    if (this.ids.has(id) || this.ids.size >= 10000) return false;
    this.ids.set(id, now);
    return true;
  }
}
