
import { UserIdentity } from "./identity.js";
import { startSender, DataPacket } from "../waku-client/send.js";
import { startReceiver } from "../waku-client/receive.js";
import { storePublicKey, getPublicKey } from "../utility/publickeys.js";
import { encrypt } from 'eciesjs';


export async function sendMessage(sender: UserIdentity,
  recipientAddress: string,
  plaintext: string) {

  // 1. Sign message
  const signature = await sender.signMessage(plaintext);
  const recipientpublicKey = getPublicKey(recipientAddress)!;
  console.log("the public key:", recipientpublicKey);

  // 2. Encrypt 
  const encryptedMessage = encrypt(recipientpublicKey, Buffer.from(plaintext, "utf8"));

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