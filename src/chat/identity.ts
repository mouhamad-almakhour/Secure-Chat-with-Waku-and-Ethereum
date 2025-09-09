import { EthereumWalletConnector } from "../web3-connect/eth.js";
import { ethers } from "ethers";

export class UserIdentity {
  walletConnector: EthereumWalletConnector;
  address: string;
  publicKey: string;

  private constructor(walletConnector: EthereumWalletConnector, address: string, publicKey: string) {
    this.walletConnector = walletConnector;
    this.address = address;
    this.publicKey = publicKey;
  }

  // Async factory method
  static async createUser(privateKey: string): Promise<UserIdentity> {
    const connector = new EthereumWalletConnector();
    const walletInfo = await connector.connectWithPrivateKey(privateKey);

    if (!walletInfo) {
      throw new Error("No wallet connected");
    }

    return new UserIdentity(connector, walletInfo.address, walletInfo.publickey)
  }

  // Reuse existing signMessage
  async signMessage(message: string) {
    return this.walletConnector.signMessage(message);
  }

  // Verify a message signature
  static verifyMessage(message: string, signature: string) {
    return ethers.verifyMessage(message, signature);
  }
}
