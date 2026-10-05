import { useState, type FormEvent } from "react";
import { UserPlus, Users } from "lucide-react";
import { createInvite, parseInvite } from "./invite-codec";
import type { Contact, Identity } from "../../shared/types";
export function Invites({
  identity,
  onAdd,
  notify,
}: {
  identity: Identity;
  onAdd: (contact: Contact) => void;
  notify: (text: string) => void;
}) {
  const [name, setName] = useState(""),
    [input, setInput] = useState(""),
    [error, setError] = useState("");
  const invite = createInvite(
    identity.wallet.address,
    identity.wallet.signingKey.publicKey,
  );
  async function copy() {
    try {
      await navigator.clipboard.writeText(invite);
      notify("Contact invite copied.");
    } catch {
      notify("Copy the invite from the text field.");
    }
  }
  function add(e: FormEvent) {
    e.preventDefault();
    try {
      const parsed = parseInvite(input);
      if (parsed.address === identity.wallet.address)
        throw Error("This is your own invite. Ask your contact for theirs.");
      onAdd({ ...parsed, name: name.trim() || parsed.address.slice(0, 10) });
      setName("");
      setInput("");
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not import the invite.");
    }
  }
  return (
    <section className="screen invites-screen" aria-labelledby="invite-title">
      <header>
        <div className="step-caption">Connect with someone you know</div>
        <h2 id="invite-title">Good conversations start with an invite.</h2>
        <p>
          Only one person needs to share an invite. The other imports it and
          sends the first message.
        </p>
      </header>
      <div className="invite-grid">
        <article className="invite-panel">
          <span className="invite-illustration">
            <Users aria-hidden="true" />
          </span>
          <h3>Share your invite</h3>
          <p>
            Send your contact invite through a channel you trust. Your private
            key is never included.
          </p>
          <label htmlFor="share-invite">Your contact invite</label>
          <textarea
            id="share-invite"
            readOnly
            value={invite}
            spellCheck={false}
          />
          <button className="primary" onClick={copy}>
            Copy contact invite
          </button>
          <p className="field-hint">
            {identity.name} ·{" "}
            <span className="wrap-address">{identity.wallet.address}</span>
          </p>
        </article>
        <form className="invite-panel" onSubmit={add}>
          <span className="invite-illustration">
            <UserPlus aria-hidden="true" />
          </span>
          <h3>Have an invite?</h3>
          <p>
            Import their invite and send a message. They can accept your contact
            request and reply.
          </p>
          <label htmlFor="contact-name">Contact name</label>
          <input
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="e.g. Maya"
            required
          />
          <label htmlFor="contact-invite">Contact invite</label>
          <textarea
            id="contact-invite"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            required
            maxLength={2048}
            placeholder="Paste a Waku Chat invite"
            aria-describedby="invite-error"
            aria-invalid={!!error}
          />
          <p className="error" id="invite-error" role="alert">
            {error}
          </p>
          <button className="primary">Add contact</button>
        </form>
      </div>
      <p className="invite-footnote">
        The invite owner needs to be connected when the first message is sent.
        No return invite is needed. Both people must be online to chat. Invites
        are compatible with the CLI.
      </p>
    </section>
  );
}
