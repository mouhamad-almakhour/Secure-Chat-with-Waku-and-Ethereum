import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

export interface LocalIdentityRecord {
  address: string;
  alias: string;
}

interface IdentityStore {
  identities: LocalIdentityRecord[];
}

function identityFilePath(): string {
  return path.resolve(process.cwd(), "secure-storage", "identities.json");
}

function readIdentityRecords(): LocalIdentityRecord[] {
  const filePath = identityFilePath();
  if (!fs.existsSync(filePath)) return [];

  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (!parsed || typeof parsed !== "object" || !("identities" in parsed)) {
    throw new Error("The local identities file has an invalid format.");
  }

  const identities = (parsed as IdentityStore).identities;
  if (!Array.isArray(identities)) {
    throw new Error("The local identities file has an invalid format.");
  }

  return identities.map((identity) => {
    if (
      !identity ||
      typeof identity.address !== "string" ||
      typeof identity.alias !== "string" ||
      !ethers.isAddress(identity.address)
    ) {
      throw new Error("The local identities file contains an invalid entry.");
    }

    return {
      address: ethers.getAddress(identity.address),
      alias: identity.alias,
    };
  });
}

export function listLocalIdentities(): LocalIdentityRecord[] {
  return readIdentityRecords();
}

/** Save only the public address and a user-chosen label. Never pass a private key here. */
export function saveLocalIdentity(address: string, alias: string): LocalIdentityRecord {
  if (!ethers.isAddress(address)) {
    throw new Error("Wallet address is not a valid Ethereum address.");
  }

  const normalizedAddress = ethers.getAddress(address);
  const normalizedAlias = alias.trim();
  if (!normalizedAlias) {
    throw new Error("Identity alias cannot be empty.");
  }

  const identities = readIdentityRecords();
  const existingIndex = identities.findIndex(
    (identity) => identity.address.toLowerCase() === normalizedAddress.toLowerCase(),
  );
  const record = { address: normalizedAddress, alias: normalizedAlias };

  if (existingIndex >= 0) identities[existingIndex] = record;
  else identities.push(record);

  const filePath = identityFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ identities }, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });

  return record;
}
