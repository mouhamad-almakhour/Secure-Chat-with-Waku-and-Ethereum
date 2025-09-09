import { createLightNode, Protocols } from '@waku/sdk';
import { createDecoder, createEncoder } from '@waku/sdk';
import type { IRoutingInfo } from '@waku/interfaces';
import { createRoutingInfo } from '@waku/utils';


export interface NetworkConfig {
    clusterId: number;
    numShardsInCluster: number;
}

export class WakuClient {
    private node: any;
    private encoder: any;
    private decoder: any;
    private isReady = false;
    private TestNetworkConfig!: NetworkConfig;
    private TestRoutingInfo!: IRoutingInfo;

    constructor() { }

    async initialize(): Promise<void> {
        this.TestNetworkConfig = {
            clusterId: 1,
            numShardsInCluster: 8
        };

        this.TestRoutingInfo = createRoutingInfo(this.TestNetworkConfig, {
            contentTopic: "/test/1/waku-light-push/utf8"
        });

        this.encoder = createEncoder({
            contentTopic: "/test/1/waku-light-push/utf8",
            routingInfo: this.TestRoutingInfo
        });

        this.decoder = createDecoder(
            "/test/1/waku-light-push/utf8",
            this.TestRoutingInfo
        );

        console.log("🌐 Connecting to Waku network...");

        // Create Waku light node
        this.node = await createLightNode({ defaultBootstrap: true });
        await this.node.start();

        // Wait for connection to peers
        console.log("⏳ Waiting for peers...");
        await this.node.waitForPeers([Protocols.Filter]);

        const peers = this.node.libp2p.getPeers();
        console.log("🔗 Connected peers:", peers);

        const connectedPeers = this.node.libp2p.getConnections();


        if (connectedPeers.length < 1) {
            throw new Error("Expected at least 1 connection for js-waku.");
        }

        await new Promise(resolve => setTimeout(resolve, 2000));
        this.isReady = true;
        console.log("✅ Connected to Waku network");
    }

    // send messages via waku p2p protocol
    async sendMessage(encryptedPayload: Uint8Array): Promise<void> {
        if (!this.isReady || !this.node) {
            throw new Error("Waku client not ready");
        }

        console.log("📤 Encrypted payload:", encryptedPayload);

        const result = await this.node.lightPush.send(this.encoder, {
            payload: encryptedPayload,
        });

        console.log("📤 Send result:", result);
        if (!result.successes.length) {
            throw new Error("Failed to send message to Waku network");
        }

        console.log("📤 Message sent");
    }

    async subscribeToMessages(callback: any): Promise<void> {
        if (!this.isReady || !this.node) {
            throw new Error("Waku client not ready");
        }

        this.node.filter.subscribe([this.decoder], callback);
        console.log("👂 Listening for messages...");
    }

    async stop(): Promise<void> {
        if (this.node) {
            await this.node.stop();
        }
    }
}
