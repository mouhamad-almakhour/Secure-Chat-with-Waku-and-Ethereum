import { useState, type FormEvent } from "react";
import { Wallet } from "ethers";
import { ShieldCheck } from "lucide-react";
import type { Identity } from "../../shared/types";
import { loadIdentities, saveIdentity } from "../../shared/storage";
import { Modal } from "../../shared/Modal";
export function IdentitySetup({
  onReady,
}: {
  onReady: (identity: Identity) => void;
}) {
  const [mode, setMode] = useState<"create" | "import">("create"),
    [name, setName] = useState(""),
    [key, setKey] = useState(""),
    [show, setShow] = useState(false),
    [error, setError] = useState(""),
    [candidate, setCandidate] = useState<Identity | null>(null),
    [backed, setBacked] = useState(false),
    [expected, setExpected] = useState("");
  const records = loadIdentities();
  function finish(identity: Identity) {
    try {
      saveIdentity({ name: identity.name, address: identity.wallet.address });
      setKey("");
      onReady(identity);
    } catch {
      setError(
        "Could not save the identity name. Allow local storage and try again.",
      );
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    try {
      if (!name.trim()) throw Error("Enter a name for this identity.");
      if (mode === "import" && !/^(0x)?[0-9a-fA-F]{64}$/.test(key.trim()))
        throw Error(
          "Enter a valid private key: 64 hexadecimal characters, optionally starting with 0x.",
        );
      let wallet;
      try {
        wallet =
          mode === "create" ? Wallet.createRandom() : new Wallet(key.trim());
      } catch {
        throw Error(
          "This private key is not valid. Check your backup and try again.",
        );
      }
      if (expected && wallet.address !== expected)
        throw Error("This key does not match the selected identity.");
      const identity = { name: name.trim(), wallet };
      if (mode === "create") {
        setCandidate(identity);
        setBacked(false);
      } else finish(identity);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not create the identity.",
      );
    }
  }
  return (
    <section className="screen setup-screen" aria-labelledby="setup-title">
      <div className="setup-story">
        <div className="brand-word">
          <span className="brand-symbol">MA</span>
          <span>Secure Chat</span>
        </div>
        <h2 id="setup-title">
          Your identity.
          <br />
          Your conversations.
        </h2>
        <p>
          A private place to connect, powered by your local identity and the
          Waku network.
        </p>
        <div className="orbit-art" aria-hidden="true">
          <div className="orbit o1" />
          <div className="orbit o2" />
          <div className="orbit o3" />
          <div className="orbit-center">MA</div>
          <div className="satellite s1">You</div>
          <div className="satellite s2">A friend</div>
        </div>
        <ul className="story-list">
          <li>Messages encrypted for your recipient</li>
          <li>An identity you control</li>
          <li>No email or phone number needed</li>
        </ul>
      </div>
      <div className="setup-form">
        <div className="step-caption">Get started on this device</div>
        <h3>Make yourself at home.</h3>
        <p>Create an identity or bring one you already use.</p>
        <div
          className="identity-tabs"
          role="group"
          aria-label="Identity setup method"
        >
          <button
            aria-pressed={mode === "create"}
            onClick={() => {
              setMode("create");
              setExpected("");
              setError("");
            }}
          >
            Create identity
          </button>
          <button
            aria-pressed={mode === "import"}
            onClick={() => {
              setMode("import");
              setError("");
            }}
          >
            Import / unlock
          </button>
        </div>
        <form id="identity-form" onSubmit={submit}>
          {mode === "import" && records.length > 0 && (
            <>
              <label htmlFor="saved-identity">Saved identity</label>
              <select
                id="saved-identity"
                value={expected}
                onChange={(e) => {
                  setExpected(e.target.value);
                  const saved = records.find(
                    (r) => r.address === e.target.value,
                  );
                  if (saved) setName(saved.name);
                }}
              >
                <option value="">Import another identity</option>
                {records.map((r) => (
                  <option value={r.address} key={r.address}>
                    {r.name} ({r.address.slice(0, 8)}…)
                  </option>
                ))}
              </select>
            </>
          )}
          <label htmlFor="identity-name">Your local name</label>
          <input
            id="identity-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={40}
            required
            autoComplete="nickname"
          />
          <p className="field-hint">
            Saved on this device with your public address.
          </p>
          {mode === "import" && (
            <>
              <label htmlFor="private-key">Private key</label>
              <input
                id="private-key"
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                required
                autoComplete="off"
                spellCheck={false}
                aria-describedby="key-help"
              />
              <p id="key-help" className="field-hint">
                Your key stays in memory for this session. It is never saved or
                sent to a server.
              </p>
              <button
                className="text-button"
                type="button"
                aria-pressed={show}
                onClick={() => setShow((v) => !v)}
              >
                {show ? "Hide" : "Show"} private key
              </button>
            </>
          )}
          <div className="setup-notice">
            <ShieldCheck aria-hidden="true" />
            <p>
              Use a dedicated chat identity. You’ll need its private key to
              unlock it again after closing the app.
            </p>
          </div>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button className="primary wide">
            {mode === "create" ? "Create identity" : "Unlock identity"}
          </button>
        </form>
      </div>
      {candidate && (
        <Modal title="Back up your identity" onClose={() => setCandidate(null)}>
          <p>
            This private key is shown during setup. Store it safely; it cannot
            be recovered if lost.
          </p>
          <label htmlFor="backup-key">Private key</label>
          <textarea
            id="backup-key"
            value={candidate.wallet.privateKey}
            readOnly
            spellCheck={false}
          />
          <label className="check-label">
            <input
              type="checkbox"
              checked={backed}
              onChange={(e) => setBacked(e.target.checked)}
            />{" "}
            I have safely backed up my private key.
          </label>
          {error && (
            <p className="error" role="alert">
              {error}
            </p>
          )}
          <button
            className="primary wide"
            disabled={!backed}
            onClick={() => finish(candidate)}
          >
            Continue to invites
          </button>
        </Modal>
      )}
    </section>
  );
}
