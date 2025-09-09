import protobuf from "protobufjs";
import { WakuClient } from "./waku.js";
import { UserIdentity } from "../chat/identity.js";
import { decrypt } from 'eciesjs';

// 1. Define the protobuf message schema
export const DataPacket = new protobuf.Type("DataPacket")
    .add(new protobuf.Field("timestamp", 1, "uint64"))
    .add(new protobuf.Field("from", 2, "string"))
    .add(new protobuf.Field("to", 3, "string")) // recipient address
    .add(new protobuf.Field("message", 4, "string")) // encrypted or plaintext
    .add(new protobuf.Field("type", 5, "string")) // signed by sender
    .add(new protobuf.Field("signature", 6, "string")); // signed by sender

// 2. Define TypeScript type for the message
export interface DecodedMessage {
    timestamp: number;
    from: string;
    to: string;
    message: string;
    type: string;
    signature: string;
    text: string;
};

// 3. handler for processing received messages
function onMessageReceived(msg: DecodedMessage): void {
    console.log("✅ Received message:", msg);
}

// 4. Main receiver function
export async function startReceiver(recipient: UserIdentity, recipientPrivateKey: string): Promise<void> {
    const waku = new WakuClient();
    await waku.initialize();

    const callback = (wakuMessage: any): void => {
        if (!wakuMessage.payload) return;

        try {
            const decoded = DataPacket.decode(wakuMessage.payload);
            const object = DataPacket.toObject(decoded, {
                longs: Number,
                enums: String,
                bytes: String
            }) as any;

            if (object.type === "publicKeyBroadcast") {

                const fullMessage: DecodedMessage = {
                    ...object,
                    text: object.message,
                };
                onMessageReceived(fullMessage);
                console.log(`📡 Stored public key for ${object.from}`);
                return;
            }

            if (object.to !== recipient.address) return;
            const encryptedBuffer = Buffer.from(object.message, "base64");
            const decryptedBuffer = decrypt(recipientPrivateKey, encryptedBuffer);
            const decrypted = decryptedBuffer.toString("utf8");

            // Verify signature
            const signer = UserIdentity.verifyMessage(decrypted, object.signature);
            if (signer === object.from) {
                console.log(`✅ Message from ${object.from}: ${decrypted}`);
            } else {
                console.error('❌ Signature verification failed');
            }

            const fullMessage: DecodedMessage = {
                ...object,
                text: decrypted,
            };

            onMessageReceived(fullMessage);
        } catch (err) {
            console.error("❌ Failed to decode message:", err);
        }
    };

    await waku.subscribeToMessages(callback);
}

