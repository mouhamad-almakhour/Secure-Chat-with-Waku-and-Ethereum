import type { Wallet, HDNodeWallet } from "ethers";
export type Identity = { name: string; wallet: Wallet | HDNodeWallet };
export type IdentityRecord = { name: string; address: string };
export type Contact = { name: string; address: string; publicKey: string };
export type ChatMessage = {
  id: string;
  from: string;
  to: string;
  text: string;
  timestamp: number;
  status: "sending" | "accepted" | "received" | "failed";
};
export type NetworkStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error";

export type ReceivedMessage = ChatMessage & { senderPublicKey: string };
