import { WakuClient } from "./waku.js";
export { Packet as DataPacket } from "../chat/protocol.js";
export async function startSender(payload: Uint8Array) {
  const waku = new WakuClient();
  try {
    await waku.initialize();
    await waku.sendMessage(payload);
  } finally {
    await waku.stop();
  }
}
