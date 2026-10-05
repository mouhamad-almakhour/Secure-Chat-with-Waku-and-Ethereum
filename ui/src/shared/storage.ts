import type { Contact, IdentityRecord } from "./types";
import { getAddress, SigningKey, computeAddress } from "ethers";
export function loadIdentities(): IdentityRecord[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem("ma-identities") || "[]",
    );
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (v): v is IdentityRecord =>
          !!v && typeof v.name === "string" && typeof v.address === "string",
      )
      .map((v) => ({ name: v.name, address: getAddress(v.address) }));
  } catch {
    return [];
  }
}
export function saveIdentity(record: IdentityRecord) {
  const records = loadIdentities().filter((i) => i.address !== record.address);
  localStorage.setItem("ma-identities", JSON.stringify([...records, record]));
}
export function loadContacts(address: string): Contact[] {
  try {
    const data: unknown = JSON.parse(
      localStorage.getItem("ma-contacts-" + address) || "[]",
    );
    if (!Array.isArray(data)) return [];
    return data
      .filter(
        (v): v is Contact =>
          !!v &&
          typeof v.name === "string" &&
          typeof v.address === "string" &&
          typeof v.publicKey === "string",
      )
      .map((v) => {
        const key = SigningKey.computePublicKey(v.publicKey, false);
        const address = getAddress(v.address);
        if (computeAddress(key) !== address) throw Error("Invalid contact");
        return { name: v.name, address, publicKey: key };
      });
  } catch {
    return [];
  }
}
export function saveContacts(address: string, contacts: Contact[]) {
  localStorage.setItem("ma-contacts-" + address, JSON.stringify(contacts));
}
