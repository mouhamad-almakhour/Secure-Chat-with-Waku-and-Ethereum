import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  ArrowLeft,
  ArrowUp,
  Copy,
  LockKeyhole,
  MessageSquare,
  Plus,
  ShieldCheck,
  Users,
  Wifi,
  WifiOff,
} from "lucide-react";
import type {
  Contact,
  Identity,
  ChatMessage,
  NetworkStatus,
} from "../../shared/types";
const short = (address: string) =>
  address.slice(0, 6) + "…" + address.slice(-4);
const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
export function ChatWorkspace({
  drafts,
  setDrafts,
  initialContact,
  identity,
  contacts,
  messages,
  status,
  networkError,
  onConnect,
  onDisconnect,
  onSend,
  onInvites,
  onLock,
  notify,
}: {
  drafts: Record<string, string>;
  setDrafts: Dispatch<SetStateAction<Record<string, string>>>;
  initialContact?: string | null;
  identity: Identity;
  contacts: Contact[];
  messages: ChatMessage[];
  status: NetworkStatus;
  networkError: string;
  onConnect: () => void;
  onDisconnect: () => void;
  onSend: (contact: Contact, text: string) => Promise<boolean>;
  onInvites: () => void;
  onLock: () => void;
  notify: (text: string) => void;
}) {
  const [selected, setSelected] = useState<string | null>(
      initialContact || contacts[0]?.address || null,
    ),
    [query, setQuery] = useState(""),
    [mobile, setMobile] = useState(Boolean(initialContact)),
    [sending, setSending] = useState(false);
  const log = useRef<HTMLDivElement>(null),
    heading = useRef<HTMLHeadingElement>(null);
  const contact = contacts.find((c) => c.address === selected) || contacts[0];
  const conversation = messages.filter(
    (m) => contact && (m.from === contact.address || m.to === contact.address),
  );
  useEffect(() => {
    log.current?.scrollTo({ top: log.current.scrollHeight });
  }, [messages, selected]);
  async function send(e?: FormEvent) {
    e?.preventDefault();
    if (!contact || sending || status !== "connected") return;
    const submitted = drafts[contact.address] || "";
    const text = submitted.trim();
    if (!text) return;
    setSending(true);
    try {
      if (await onSend(contact, text))
        setDrafts((d) =>
          d[contact.address] === submitted
            ? { ...d, [contact.address]: "" }
            : d,
        );
    } finally {
      setSending(false);
    }
  }
  const connected = status === "connected";
  return (
    <main className={"app " + (mobile ? "mobile-chat" : "")} id="workspace">
      <aside className="rail" aria-label="Application navigation">
        <div className="ma-logo">MA</div>
        <span className="rail-word">secure chat</span>
        <button className="active rail-nav" aria-label="Conversations">
          <MessageSquare aria-hidden="true" />
          <small>Chats</small>
        </button>
        <button className="rail-nav" onClick={onInvites}>
          <Users aria-hidden="true" />
          <small>Invites</small>
        </button>
        <button className="rail-nav bottom" onClick={onLock}>
          <LockKeyhole aria-hidden="true" />
          <small>Lock</small>
        </button>
        <div className="avatar green" title={identity.name}>
          {initials(identity.name)}
        </div>
      </aside>
      <aside className="sidebar">
        <div className="sidebar-head">
          <h2>
            Messages<span style={{ color: "var(--accent)" }}>.</span>
          </h2>
          <button
            className="icon-button"
            aria-label="Add contact"
            onClick={onInvites}
          >
            <Plus aria-hidden="true" />
          </button>
        </div>
        <label className="search-label" htmlFor="search">
          Search conversations
        </label>
        <div className="search">
          <input
            id="search"
            type="search"
            placeholder="Search by name or address"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="list-label">
          <span>Your conversations</span>
          <span>{contacts.length}</span>
        </div>
        <div className="contacts">
          {contacts
            .filter((c) =>
              (c.name + " " + c.address)
                .toLowerCase()
                .includes(query.toLowerCase()),
            )
            .map((c, i) => {
              const last = messages
                .filter((m) => m.from === c.address || m.to === c.address)
                .at(-1);
              return (
                <button
                  className={
                    "contact " +
                    (contact?.address === c.address ? "selected" : "")
                  }
                  aria-pressed={contact?.address === c.address}
                  key={c.address}
                  onClick={() => {
                    setSelected(c.address);
                    setMobile(true);
                    requestAnimationFrame(() => heading.current?.focus());
                  }}
                >
                  <span
                    className={"avatar " + ["", "blue", "pink", "green"][i % 4]}
                  >
                    {initials(c.name)}
                  </span>
                  <span className="contact-info">
                    <b>{c.name}</b>
                    <p>{last?.text || "Start a private conversation"}</p>
                  </span>
                  {last && (
                    <span className="contact-meta">
                      {new Date(last.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  )}
                </button>
              );
            })}
        </div>
        {!contacts.length && (
          <div className="empty-state">
            <Users aria-hidden="true" />
            <p>Your people belong here.</p>
            <p className="field-hint">
              Share your invite or import someone’s to start a conversation.
            </p>
            <button className="primary" onClick={onInvites}>
              Add a contact
            </button>
          </div>
        )}
        {contacts.length > 0 &&
          !contacts.some((c) =>
            (c.name + " " + c.address)
              .toLowerCase()
              .includes(query.toLowerCase()),
          ) && <p className="empty-state">No contacts match your search.</p>}
        <div className="network">
          <b>
            {connected ? (
              <Wifi aria-hidden="true" />
            ) : (
              <WifiOff aria-hidden="true" />
            )}
            {status === "connecting"
              ? "Connecting…"
              : connected
                ? "Connected to Waku"
                : status === "error"
                  ? "Connection failed"
                  : "Not connected"}
          </b>
          <p>{networkError || "Keep the app open to receive messages."}</p>
          {connected ? (
            <button className="text-button" onClick={onDisconnect}>
              Disconnect
            </button>
          ) : (
            <button
              className="text-button"
              onClick={onConnect}
              disabled={status === "connecting"}
            >
              {status === "connecting"
                ? "Finding Waku peers…"
                : "Connect to Waku"}
            </button>
          )}
        </div>
      </aside>
      <section className="chat">
        {contact ? (
          <>
            <header className="chat-head">
              <button
                className="icon-button mobile-only"
                aria-label="Back to conversations"
                onClick={() => {
                  setMobile(false);
                  requestAnimationFrame(() =>
                    document
                      .querySelector<HTMLButtonElement>(".contact.selected")
                      ?.focus(),
                  );
                }}
              >
                <ArrowLeft aria-hidden="true" />
              </button>
              <div className="avatar">{initials(contact.name)}</div>
              <div>
                <h2 ref={heading} tabIndex={-1}>
                  {contact.name}
                </h2>
                <p>{short(contact.address)} · Ethereum identity</p>
              </div>
              <div className="actions">
                <span className="secure-pill">
                  <LockKeyhole aria-hidden="true" />
                  Encrypted chat
                </span>
              </div>
            </header>
            <div
              className="messages"
              ref={log}
              role="log"
              aria-label="Conversation messages"
              aria-live="polite"
            >
              <p className="encryption-note">
                <LockKeyhole aria-hidden="true" /> Messages are encrypted for
                your recipient and signed with your identity.
              </p>
              {!conversation.length && (
                <div className="empty-state">
                  <h3>Say hello to {contact.name}.</h3>
                  <p className="field-hint">
                    Both of you need to be connected to receive messages.
                  </p>
                </div>
              )}
              {conversation.map((m) => (
                <article
                  className={
                    "message " +
                    (m.from === identity.wallet.address ? "out" : "in")
                  }
                  key={m.id}
                >
                  <div className="bubble">{m.text}</div>
                  <time
                    dateTime={
                      Number.isFinite(new Date(m.timestamp).getTime())
                        ? new Date(m.timestamp).toISOString()
                        : undefined
                    }
                  >
                    {new Date(m.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    ·{" "}
                    {m.status === "accepted"
                      ? "Accepted by Waku"
                      : m.status === "received"
                        ? "Signature verified"
                        : m.status === "failed"
                          ? "Send failed — message kept in composer"
                          : "Sending…"}
                  </time>
                </article>
              ))}
            </div>
            <div className="composer-area">
              {!connected && (
                <p className="offline-note" role="status">
                  Connect to Waku to send and receive messages.{" "}
                  <button
                    className="text-button"
                    disabled={status === "connecting"}
                    onClick={onConnect}
                  >
                    Connect
                  </button>
                </p>
              )}
              <label className="composer-label" htmlFor="draft">
                Message
              </label>
              <form className="composer" onSubmit={send}>
                <LockKeyhole aria-hidden="true" />
                <textarea
                  id="draft"
                  placeholder="Write a private message…"
                  value={drafts[contact.address] || ""}
                  maxLength={4000}
                  onChange={(e) =>
                    setDrafts((d) => ({
                      ...d,
                      [contact.address]: e.target.value,
                    }))
                  }
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                />
                <button
                  className="send"
                  aria-label={sending ? "Sending message" : "Send message"}
                  disabled={
                    !connected ||
                    sending ||
                    !(drafts[contact.address] || "").trim()
                  }
                >
                  <ArrowUp aria-hidden="true" />
                </button>
              </form>
              <div className="composer-note">
                <span>History stays in memory for this session.</span>
                <span>Shift + Enter for a new line</span>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state chat-empty">
            <MessageSquare aria-hidden="true" />
            <h2>A private space for your conversations.</h2>
            <p>Import a contact invite to get started.</p>
            <button className="primary" onClick={onInvites}>
              Contact invites
            </button>
          </div>
        )}
      </section>
      <aside className="details">
        <div className="eyebrow">Conversation details</div>
        {contact && (
          <>
            <div className="profile">
              <div className="avatar">{initials(contact.name)}</div>
              <h3>{contact.name}</h3>
              <p>Ethereum identity</p>
            </div>
            <div className="detail-block">
              <label>Wallet address</label>
              <div className="address">
                <span title={contact.address}>{short(contact.address)}</span>
                <button
                  aria-label="Copy contact address"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(contact.address);
                      notify("Contact address copied.");
                    } catch {
                      notify("Copy the address from the invite screen.");
                    }
                  }}
                >
                  <Copy aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        )}
        <div className="detail-block">
          <div className="eyebrow">Private by design</div>
          <div className="security-row">
            <LockKeyhole aria-hidden="true" />
            End-to-end encrypted
          </div>
          <div className="security-row">
            <ShieldCheck aria-hidden="true" />
            Signed with your identity
          </div>
          <div className="security-row">
            <Wifi aria-hidden="true" />
            Delivered through Waku
          </div>
          <p className="detail-note">
            Addresses and timestamps remain visible on the network. Peer
            acceptance does not confirm recipient delivery.
          </p>
        </div>
        <button className="invite-button" onClick={onInvites}>
          Share or import an invite
        </button>
      </aside>
    </main>
  );
}
