import { describe, expect, it } from "vitest";
import { Wallet } from "ethers";
import { Buffer } from "buffer";
import { decrypt, encrypt } from "eciesjs";
import { encodeMessage, decodeMessage, Packet, MessageGuard } from "./protocol";
import { createInvite, parseInvite } from "../contacts/invite-codec";
import {
  createContactInvite,
  parseContactInvite,
} from "../../../../src/chat/invites";
const alice = { name: "Alice", wallet: Wallet.createRandom() },
  bob = { name: "Bob", wallet: Wallet.createRandom() };
const contact = {
  name: bob.name,
  address: bob.wallet.address,
  publicKey: bob.wallet.signingKey.publicKey,
};
describe("encrypted CLI-compatible messages", () => {
  it("encrypts and verifies a Unicode message for the intended recipient", async () => {
    const text = "Hello, café! <script>literal</script>";
    const payload = await encodeMessage(alice, contact, text);
    expect(Buffer.from(payload).includes(Buffer.from(text))).toBe(false);
    expect(decodeMessage(bob, payload)).toMatchObject({
      text,
      from: alice.wallet.address,
      to: bob.wallet.address,
      status: "received",
    });
    expect(decodeMessage(alice, payload)).toBeNull();
  });
  it("supports a reply using only one shared invite", async () => {
    // Bob shares his invite; Alice imports it and sends the first message.
    const bobInvite = parseInvite(
      createInvite(bob.wallet.address, bob.wallet.signingKey.publicKey),
    );
    const first = decodeMessage(
      bob,
      await encodeMessage(alice, { name: "Bob", ...bobInvite }, "Hi Bob"),
    );
    expect(first).not.toBeNull();
    expect(first!.senderPublicKey).toBe(alice.wallet.signingKey.publicKey);
    // Bob learns Alice's encryption key from her verified signature, with no return invite.
    const reply = await encodeMessage(
      bob,
      {
        name: "Alice",
        address: first!.from,
        publicKey: first!.senderPublicKey,
      },
      "Hi Alice",
    );
    expect(decodeMessage(alice, reply)).toMatchObject({
      text: "Hi Alice",
      from: bob.wallet.address,
      senderPublicKey: bob.wallet.signingKey.publicKey,
    });
  });
  it("keeps repeated plaintext messages distinct by packet timestamp", async () => {
    const a = decodeMessage(bob, await encodeMessage(alice, contact, "hello"));
    const b = decodeMessage(bob, await encodeMessage(alice, contact, "hello"));
    expect(a?.id).not.toEqual(b?.id);
  });
  it("rejects a sender mismatch before displaying plaintext", async () => {
    const signature = await alice.wallet.signMessage("hello");
    const payload = Packet.encode(
      Packet.create({
        timestamp: 1,
        from: bob.wallet.address,
        to: bob.wallet.address,
        type: "NORMAL",
        signature,
        message: encrypt(contact.publicKey, Buffer.from("hello")).toString(
          "base64",
        ),
      }),
    ).finish();
    expect(decodeMessage(bob, payload)).toBeNull();
  });
  it("rejects ciphertext tampering", async () => {
    const payload = await encodeMessage(alice, contact, "hello");
    const record = Packet.toObject(Packet.decode(payload), { longs: Number });
    const cipher = Buffer.from(record.message, "base64");
    cipher[cipher.length - 1] ^= 1;
    record.message = cipher.toString("base64");
    expect(() =>
      decodeMessage(bob, Packet.encode(Packet.create(record)).finish()),
    ).toThrow();
  });
  it("rejects empty and oversized outgoing messages", async () => {
    await expect(encodeMessage(alice, contact, " ")).rejects.toThrow();
    await expect(
      encodeMessage(alice, contact, "x".repeat(4001)),
    ).rejects.toThrow();
  });
});
describe("contact invites", () => {
  it("roundtrips between browser and existing CLI", () => {
    const invite = createInvite(contact.address, contact.publicKey);
    expect(parseContactInvite(invite)).toMatchObject({
      address: contact.address,
      publicKey: contact.publicKey,
    });
    expect(
      parseInvite(createContactInvite(contact.address, contact.publicKey)),
    ).toEqual({ address: contact.address, publicKey: contact.publicKey });
  });
  it("rejects an invite whose key belongs to a different identity", () => {
    expect(() =>
      parseInvite(createInvite(alice.wallet.address, contact.publicKey)),
    ).toThrow("does not match");
  });
  it("rejects malformed, oversized and unsupported invites", () => {
    for (const value of ["bad", "waku-chat://invite/v1/???", "x".repeat(2049)])
      expect(() => parseInvite(value)).toThrow();
  });
});

describe("v2 security regressions", () => {
  it("keeps signatures encrypted and rejects altered metadata", async () => {
    const payload = await encodeMessage(alice, contact, "yes");
    const raw = Packet.toObject(Packet.decode(payload), { longs: Number });
    expect(raw.signature).toBeUndefined();
    raw.timestamp += 1;
    expect(() =>
      decodeMessage(bob, Packet.encode(Packet.create(raw)).finish()),
    ).toThrow();
    raw.timestamp = Number.MAX_SAFE_INTEGER;
    expect(
      decodeMessage(bob, Packet.encode(Packet.create(raw)).finish()),
    ).toBeNull();
  });
  it("rejects duplicate IDs independently of displayed messages and limits ingress", () => {
    const guard = new MessageGuard();
    expect(guard.accept("id")).toBe(true);
    expect(guard.accept("id")).toBe(false);
    for (let i = 0; i < 20; i++) expect(guard.allowPacket(1000)).toBe(true);
    expect(guard.allowPacket(1000)).toBe(false);
    expect(guard.allowPacket(2000)).toBe(true);
  });
  it("rejects mismatched CLI invite creation", () => {
    expect(() =>
      createContactInvite(alice.wallet.address, contact.publicKey),
    ).toThrow("does not match");
  });
});

it("rejects recipient re-encryption of a signed message to a third party", async () => {
  const charlie = { name: "Charlie", wallet: Wallet.createRandom() };
  const original = await encodeMessage(alice, contact, "hello");
  const raw = Packet.toObject(Packet.decode(original), { longs: Number });
  const inner = decrypt(
    bob.wallet.privateKey,
    Buffer.from(raw.message, "base64"),
  );
  raw.to = charlie.wallet.address;
  raw.message = encrypt(charlie.wallet.signingKey.publicKey, inner).toString(
    "base64",
  );
  expect(() =>
    decodeMessage(charlie, Packet.encode(Packet.create(raw)).finish()),
  ).toThrow();
});

it("rejects a forged v2 signature and expired packets", async () => {
  const payload = await encodeMessage(alice, contact, "hello");
  const raw = Packet.toObject(Packet.decode(payload), { longs: Number });
  const inner = JSON.parse(
    decrypt(
      bob.wallet.privateKey,
      Buffer.from(raw.message, "base64"),
    ).toString(),
  );
  inner.signature = await bob.wallet.signMessage("hello");
  raw.message = encrypt(
    contact.publicKey,
    Buffer.from(JSON.stringify(inner)),
  ).toString("base64");
  expect(() =>
    decodeMessage(bob, Packet.encode(Packet.create(raw)).finish()),
  ).toThrow();
  raw.timestamp = Date.now() - 86400001;
  expect(
    decodeMessage(bob, Packet.encode(Packet.create(raw)).finish()),
  ).toBeNull();
});
