import fs from 'fs';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_KEYS_FOLDER = path.join(__dirname, 'publickeys');

// Ensure the folder exists
if (!fs.existsSync(PUBLIC_KEYS_FOLDER)) {
    fs.mkdirSync(PUBLIC_KEYS_FOLDER, { recursive: true });
}

//Store a public key for a given address
export async function storePublicKey(address: string, publicKey: string) {
    const filePath = path.join(PUBLIC_KEYS_FOLDER, `${address}.json`);
    fs.writeFileSync(filePath, JSON.stringify({ publicKey }), 'utf-8');
    console.log(`📡 Stored public key for ${address}`);
}

//Get a public key for a given address
export function getPublicKey(address: string): string | null {
    const filePath = path.join(PUBLIC_KEYS_FOLDER, `${address}.json`);
    if (!fs.existsSync(filePath)) return null;

    const data = fs.readFileSync(filePath, 'utf-8');
    const obj = JSON.parse(data);
    return obj.publicKey || null;
}
