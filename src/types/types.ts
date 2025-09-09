export interface KeyPair {
  privateKey: string;
  publicKey: string;
  algorithm: 'ed25519' | 'x25519';
  usage: 'signing' | 'keyExchange';
}

export interface EncryptionResult {
  ciphertext: string;
  nonce: string;
  algorithm: 'aes-256-gcm';
}

export interface SignatureResult {
  signature: string;
  algorithm: 'ed25519';

}

