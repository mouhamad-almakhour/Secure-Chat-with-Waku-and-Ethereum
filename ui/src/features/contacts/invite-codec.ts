import { Buffer } from "buffer";
import { computeAddress, getAddress, SigningKey } from "ethers";
const prefix = "waku-chat://invite/v1/";
export function createInvite(address: string, publicKey: string) {
  return (
    prefix +
    Buffer.from(
      JSON.stringify({ version: 1, address: getAddress(address), publicKey }),
    )
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "")
  );
}
export function parseInvite(value: string) {
  const input = value.trim();
  if (input.length > 2048 || !input.startsWith(prefix))
    throw Error("Paste a valid Waku Chat contact invite.");
  const encoded = input.slice(prefix.length);
  if (!/^[A-Za-z0-9_-]+$/.test(encoded))
    throw Error("The invite is malformed. Ask your contact to send it again.");
  let data;
  try {
    data = JSON.parse(
      Buffer.from(
        encoded.replace(/-/g, "+").replace(/_/g, "/"),
        "base64",
      ).toString("utf8"),
    );
  } catch {
    throw Error("The invite is malformed. Ask your contact to send it again.");
  }
  if (
    data?.version !== 1 ||
    typeof data.address !== "string" ||
    typeof data.publicKey !== "string" ||
    !/^0x04[\da-f]{128}$/i.test(data.publicKey)
  )
    throw Error("This invite has an unsupported format.");
  const address = getAddress(data.address),
    publicKey = SigningKey.computePublicKey(data.publicKey, false);
  if (computeAddress(publicKey) !== address)
    throw Error("The encryption key does not match the contact address.");
  return { address, publicKey };
}
