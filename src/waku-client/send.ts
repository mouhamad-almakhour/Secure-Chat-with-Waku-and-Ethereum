import protobuf from "protobufjs";
import { WakuClient } from "./waku.js";

// 1. Define the protobuf message schema
export const DataPacket = new protobuf.Type("DataPacket")
    .add(new protobuf.Field("timestamp", 1, "uint64"))
    .add(new protobuf.Field("from", 2, "string"))
    .add(new protobuf.Field("to", 3, "string")) // recipient address
    .add(new protobuf.Field("message", 4, "string")) // encrypted or plaintext
    .add(new protobuf.Field("type", 5, "string")) // signed by sender
    .add(new protobuf.Field("signature", 6, "string")); // signed by sender
export async function startSender(protoMessage: protobuf.Message<{}>) {

    // Pass content topic and routing info separately
    const waku = new WakuClient();
    await waku.initialize();

    const serializedMessage: Uint8Array = DataPacket.encode(protoMessage).finish();

    await waku.sendMessage(serializedMessage);

    await waku.stop();


}





