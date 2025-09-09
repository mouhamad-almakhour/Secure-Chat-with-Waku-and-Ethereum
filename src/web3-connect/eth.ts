import { ethers } from 'ethers';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });




export interface WalletInfo {
    address: string;
    balance: string;
    network: string;
    chainId: number;
    publickey: string;
}


export class EthereumWalletConnector {
    private provider: ethers.JsonRpcProvider;
    private wallet: ethers.Wallet | null;
    signer: ethers.Signer | null;

    constructor() {
        this.wallet = null;
        const defaultRpc = process.env.BLOCKCHAIN_NETWORK || "https://polygon-amoy.g.alchemy.com/v2/xxxxx";
        this.provider = new ethers.JsonRpcProvider(defaultRpc);
        this.signer = null;
    }

    //connect a wallet with a private key
    async connectWithPrivateKey(privateKey: string) {
        try {

            console.log('🔐 Connecting with private key...');
            this.wallet = new ethers.Wallet(privateKey, this.provider);
            return await this.getWalletInfo();

        } catch (error) {
            if (error instanceof Error) {
                throw new Error(`Failed to connect with private key: ${error.message}`);
            }
        }
    }

    //get info of the connected wallet
    async getWalletInfo(): Promise<WalletInfo> {
        if (!this.wallet) {
            throw new Error('No wallet connected');
        }

        console.log('📊 Fetching wallet information...');

        const [balance, network] = await Promise.all([
            this.provider.getBalance(this.wallet.address),
            this.provider.getNetwork()
        ]);

        return {
            address: this.wallet.address,
            balance: ethers.formatEther(balance),
            network: network.name,
            chainId: Number(network.chainId),
            publickey: this.wallet.signingKey.publicKey
        };
    }

    //Sign message
    async signMessage(message: string) {
        if (!this.wallet) {
            throw new Error('No wallet connected');
        }
        console.log('✍️ Signing message...');
        const signature = await this.wallet.signMessage(message);
        return signature;
    }


    // Verify a message signature
    async verifyMessage(message: string, signature: string) {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        return recoveredAddress;
    }

}

