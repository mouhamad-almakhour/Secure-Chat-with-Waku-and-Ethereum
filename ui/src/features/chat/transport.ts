import {
  createLightNode,
  createEncoder,
  createDecoder,
  Protocols,
} from "@waku/sdk";
import { createRoutingInfo } from "@waku/utils";
type LightNode = Awaited<ReturnType<typeof createLightNode>>;
// Keep the CLI topic and routing configuration for invite/wire compatibility.
const topic = "/test/1/waku-light-push/utf8";
const routing = createRoutingInfo(
  { clusterId: 1, numShardsInCluster: 8 },
  { contentTopic: topic },
);
export class ChatTransport {
  private node: LightNode | undefined;
  private stopped = false;
  async connect(receive: (payload: Uint8Array) => void) {
    const node = await createLightNode({ defaultBootstrap: true });
    this.node = node;
    if (this.stopped) {
      await node.stop();
      return false;
    }
    try {
      await node.start();
      await node.waitForPeers([Protocols.Filter, Protocols.LightPush], 30000);
      if (this.stopped) {
        await node.stop();
        return false;
      }
      const result = await node.filter.subscribe(
        [createDecoder(topic, routing)],
        (message) => {
          if (message.payload && !this.stopped) receive(message.payload);
        },
      );
      if (!result)
        throw Error("Could not subscribe to Waku. Try reconnecting.");
      return !this.stopped;
    } catch (error) {
      await node.stop().catch(() => {});
      throw error;
    }
  }
  async send(payload: Uint8Array) {
    if (!this.node || this.stopped)
      throw Error("Connect to Waku before sending.");
    const result = await this.node.lightPush.send(
      createEncoder({ contentTopic: topic, routingInfo: routing }),
      { payload },
    );
    if (!result.successes.length)
      throw Error("No Waku peer accepted the message. Reconnect and retry.");
  }
  async stop() {
    this.stopped = true;
    await this.node?.stop();
  }
}
