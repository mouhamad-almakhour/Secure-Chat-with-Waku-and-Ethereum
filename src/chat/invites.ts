import { ethers } from "ethers";

const INVITE_PREFIX = "waku-chat://invite/v1/";
const MAX_INVITE_LENGTH = 2048;

export interface ContactInvite {
  version: 1;
  address: string;
  publicKey: string;
}

/**
 * Encode the sender's public contact details in a copyable, versioned invite.
 * The private key is never part of an invite.
 */
export function createContactInvite(address: string, publicKey: string): string {
  const normalizedAddress = normalizeAddress(address);
  const normalizedPublicKey = normalizePublicKey(publicKey);
  const payload: ContactInvite = {
    version: 1,
    address: normalizedAddress,
    publicKey: normalizedPublicKey,
  };
  const encoded = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${INVITE_PREFIX}${encoded}`;
}

/** Parse and validate a version 1 contact invite copied from another user. */
export function parseContactInvite(input: string): ContactInvite {
  const invite = input.trim();
  if (invite.length === 0 || invite.length > MAX_INVITE_LENGTH) {
    throw new Error("Contact invite is empty or too long.");
  }
  if (!invite.startsWith(INVITE_PREFIX)) {
    throw new Error("This is not a supported Waku Chat contact invite.");
  }

  let payload: unknown;
  try {
    const encoded = invite.slice(INVITE_PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) {
      throw new Error("Invalid invite encoding.");
    }
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("Contact invite is malformed or corrupted.");
  }

  if (!payload || typeof payload !== "object") {
    throw new Error("Contact invite must contain a valid contact.");
  }

  const candidate = payload as Partial<ContactInvite>;
  if (candidate.version !== 1) {
    throw new Error("This contact invite version is not supported.");
  }
  if (typeof candidate.address !== "string" || typeof candidate.publicKey !== "string") {
    throw new Error("Contact invite is missing its address or public key.");
  }

  return {
    version: 1,
    address: normalizeAddress(candidate.address),
    publicKey: normalizePublicKey(candidate.publicKey),
  };
}

function normalizeAddress(address: string): string {
  if (!ethers.isAddress(address)) {
    throw new Error("Contact address is not a valid Ethereum address.");
  }
  return ethers.getAddress(address);
}

function normalizePublicKey(publicKey: string): string {
  if (!/^0x04[0-9a-fA-F]{128}$/.test(publicKey)) {
    throw new Error("Contact public key must be an uncompressed secp256k1 key.");
  }

  try {
    return ethers.SigningKey.computePublicKey(publicKey, false);
  } catch {
    throw new Error("Contact public key is invalid.");
  }
}
