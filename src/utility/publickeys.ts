import fs from "node:fs";
import path from "node:path";
import { ethers } from "ethers";

interface ContactStore {
    contacts: Record<string, string>;
}

function contactFilePath(): string {
    return path.resolve(process.cwd(), "secure-storage", "contacts.json");
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

function readContacts(): Record<string, string> {
    const filePath = contactFilePath();
    if (!fs.existsSync(filePath)) return {};

    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, "utf8"));
    if (!parsed || typeof parsed !== "object" || !("contacts" in parsed)) {
        throw new Error("The local contacts file has an invalid format.");
    }

    const contacts = (parsed as ContactStore).contacts;
    if (!contacts || typeof contacts !== "object" || Array.isArray(contacts)) {
        throw new Error("The local contacts file has an invalid format.");
    }

    return contacts;
}

// Store a public key for a given address in this user's local contact book.
export async function storePublicKey(address: string, publicKey: string): Promise<void> {
    const normalizedAddress = normalizeAddress(address);
    const normalizedPublicKey = normalizePublicKey(publicKey);
    const filePath = contactFilePath();
    const contacts = readContacts();

    contacts[normalizedAddress] = normalizedPublicKey;
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ contacts }, null, 2), {
        encoding: "utf8",
        mode: 0o600,
    });
    console.log(`Saved contact key for ${normalizedAddress} locally.`);
}

// Get the public key for a contact, if it has been imported or saved locally.
export function getPublicKey(address: string): string | null {
    const normalizedAddress = normalizeAddress(address);
    const contacts = readContacts();
    return contacts[normalizedAddress] ?? null;
}
