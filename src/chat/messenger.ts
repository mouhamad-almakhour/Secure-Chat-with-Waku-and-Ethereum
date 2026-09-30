
import { UserIdentity } from "./identity.js";
import { startSender, DataPacket } from "../waku-client/send.js";
import { startReceiver } from "../waku-client/receive.js";
import { storePublicKey, getPublicKey } from "../utility/publickeys.js";
import { encrypt } from 'eciesjs';


export async function sendMessage(sender: UserIdentity,
  recipientAddress: string,
  plaintext: string) {

  const recipientPublicKey = getPublicKey(recipientAddress);
  if (!recipientPublicKey) {
    throw new Error(
      `No encryption key is saved for ${recipientAddress}. Import their Waku Chat contact invite first.`,
    );
  }

  // 1. Sign message
  const signature = await sender.signMessage(plaintext);
  console.log("the public key:", recipientPublicKey);

  // 2. Encrypt
  const encryptedMessage = encrypt(recipientPublicKey, Buffer.from(plaintext, "utf8"));

  // 3. Construct payload
  const payload = DataPacket.create({
    timestamp: Date.now(),
    from: sender.address,
    to: recipientAddress,
    message: encryptedMessage.toString("base64"),
    type: "NORMAL",
    signature
  });

  // 4. Send over Waku
  startSender(payload);
}


export async function BroadcastePublicKey(senderaddress: string, publicKey: string) {

  // 1. Construct payload
  const payload = DataPacket.create({
    timestamp: Date.now(),
    from: senderaddress,
    to: "Broadcast",
    message: publicKey,
    type: "publicKeyBroadcast",
    signature: "No"

  });


  await storePublicKey(senderaddress, publicKey);
  // 2. Send over Waku
  await startSender(payload);


}

export async function receiveMessage(recipient: UserIdentity, recipientPrivateKey: string) {
  await startReceiver(recipient, recipientPrivateKey);

}