import { useEffect, useRef, useState } from "react";
import { IdentitySetup } from "./features/identity/IdentitySetup";
import { Invites } from "./features/contacts/Invites";
import { ChatWorkspace } from "./features/chat/ChatWorkspace";
import type { ChatTransport } from "./features/chat/transport";
import {
  decodeMessage,
  encodeMessage,
  MessageGuard,
} from "./features/chat/protocol";
import { loadContacts, saveContacts } from "./shared/storage";
import { Modal } from "./shared/Modal";
import type {
  Identity,
  Contact,
  ChatMessage,
  NetworkStatus,
} from "./shared/types";
type Theme = "system" | "light" | "dark";
export default function App() {
  const [identity, setIdentity] = useState<Identity | null>(null),
    [contacts, setContacts] = useState<Contact[]>([]),
    [messages, setMessages] = useState<ChatMessage[]>([]),
    [requests, setRequests] = useState<Contact[]>([]),
    [activeAddress, setActiveAddress] = useState<string | null>(null),
    [screen, setScreen] = useState<"chat" | "invites">("chat"),
    [status, setStatus] = useState<NetworkStatus>("disconnected"),
    [networkError, setNetworkError] = useState(""),
    [attempt, setAttempt] = useState(0),
    [wantConnection, setWantConnection] = useState(false),
    [toast, setToast] = useState(""),
    [lock, setLock] = useState(false),
    [theme, setTheme] = useState<Theme>(() => {
      try {
        const t = localStorage.getItem("ma-theme");
        return t === "light" || t === "dark" ? t : "system";
      } catch {
        return "system";
      }
    });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const guard = useRef(new MessageGuard());
  const transport = useRef<ChatTransport | null>(null),
    knownContacts = useRef(contacts),
    ignoredSenders = useRef(new Set<string>());
  knownContacts.current = contacts;
  useEffect(() => {
    const media = matchMedia("(prefers-color-scheme: dark)");
    const apply = () =>
      (document.documentElement.dataset.theme =
        theme === "system" ? (media.matches ? "dark" : "light") : theme);
    apply();
    media.addEventListener("change", apply);
    try {
      localStorage.setItem("ma-theme", theme);
    } catch {
      /* Appearance still works without persistence. */
    }
    return () => media.removeEventListener("change", apply);
  }, [theme]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4500);
    return () => clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    if (!identity || !wantConnection) {
      setStatus("disconnected");
      return;
    }
    let current = true;
    let client: ChatTransport | undefined;
    setStatus("connecting");
    setNetworkError("");
    void import("./features/chat/transport")
      .then(async ({ ChatTransport }) => {
        if (!current) return;
        client = new ChatTransport();
        transport.current = client;
        const ready = await client.connect((payload) => {
          if (!current || !guard.current.allowPacket()) return;
          try {
            const message = decodeMessage(identity, payload);
            if (!message || !guard.current.accept(message.id)) return;
            if (ignoredSenders.current.has(message.from)) return;
            if (
              !knownContacts.current.some((c) => c.address === message.from)
            ) {
              const request = {
                address: message.from,
                publicKey: message.senderPublicKey,
                name: message.from.slice(0, 10),
              };
              setRequests((old) =>
                old.some((r) => r.address === request.address)
                  ? old
                  : old.length < 20
                    ? [...old, request]
                    : old,
              );
              setToast(
                "New verified contact request. Accept it to reply; no second invite is needed.",
              );
            }
            setMessages((old) =>
              old.some((m) => m.id === message.id)
                ? old
                : [...old, message].slice(-500),
            );
          } catch {
            setToast("A malformed or unverified message was rejected.");
          }
        });
        if (current && ready) setStatus("connected");
      })
      .catch((e) => {
        if (current) {
          setStatus("error");
          setNetworkError(
            e instanceof Error
              ? e.message
              : "Waku connection failed. Reconnect to try again.",
          );
        }
      });
    return () => {
      current = false;
      transport.current = null;
      void client?.stop().catch(() => {});
    };
  }, [identity, attempt, wantConnection]);
  useEffect(() => {
    const offline = () => {
      setWantConnection(false);
      setNetworkError(
        "This device is offline. Reconnect when internet access returns.",
      );
    };
    window.addEventListener("offline", offline);
    return () => window.removeEventListener("offline", offline);
  }, []);
  function ready(value: Identity) {
    setContacts(loadContacts(value.wallet.address));
    setIdentity(value);
    setScreen("invites");
    setWantConnection(true);
  }
  function connect() {
    setWantConnection(true);
    setAttempt((n) => n + 1);
  }
  function addContact(contact: Contact) {
    if (!identity) return;
    const next = [
      ...contacts.filter((c) => c.address !== contact.address),
      contact,
    ];
    try {
      saveContacts(identity.wallet.address, next);
      knownContacts.current = next;
      setContacts(next);
      setRequests((old) =>
        old.filter((request) => request.address !== contact.address),
      );
      setActiveAddress(contact.address);
      setScreen("chat");
      setToast("Contact added. Connect to Waku together to chat.");
    } catch {
      setToast("Could not save contacts. Allow local storage and try again.");
    }
  }
  async function send(contact: Contact, text: string) {
    if (!identity || !transport.current || status !== "connected") return false;
    const id = crypto.randomUUID(),
      timestamp = Date.now(),
      session = transport.current;
    setMessages((old) =>
      [
        ...old,
        {
          id,
          from: identity.wallet.address,
          to: contact.address,
          text,
          timestamp,
          status: "sending" as const,
        },
      ].slice(-500),
    );
    try {
      await session.send(
        await encodeMessage(identity, contact, text, timestamp),
      );
      setMessages((old) =>
        old.map((m) => (m.id === id ? { ...m, status: "accepted" } : m)),
      );
      return true;
    } catch (e) {
      setMessages((old) =>
        old.map((m) => (m.id === id ? { ...m, status: "failed" } : m)),
      );
      setToast(e instanceof Error ? e.message : "Message failed. Try again.");
      return false;
    }
  }
  function doLock() {
    setWantConnection(false);
    setIdentity(null);
    setContacts([]);
    setMessages([]);
    setDrafts({});
    guard.current = new MessageGuard();
    setRequests([]);
    setActiveAddress(null);
    ignoredSenders.current.clear();
    setLock(false);
    setToast("Identity locked. Import its private key to unlock it again.");
  }
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <div className="preview">
        <header className="preview-top">
          <div>
            <div className="preview-label">
              Local identities. Private conversations.
            </div>
            <h1>MA Secure Chat</h1>
          </div>
          <div className="theme-control">
            <label htmlFor="theme">Appearance</label>
            <select
              id="theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value as Theme)}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
        </header>
        {identity && (
          <nav className="screen-nav" aria-label="Application screens">
            <button
              aria-pressed={screen === "chat"}
              onClick={() => setScreen("chat")}
            >
              Conversations
            </button>
            <button
              aria-pressed={screen === "invites"}
              onClick={() => setScreen("invites")}
            >
              Contact invites
            </button>
            <button onClick={() => setLock(true)}>Lock identity</button>
            <span>
              {identity.name} ·{" "}
              {status === "connected"
                ? "Connected to Waku"
                : status === "connecting"
                  ? "Connecting to Waku…"
                  : "Not connected"}
            </span>
          </nav>
        )}
        {identity && status !== "connected" && status !== "connecting" && (
          <div className="connection-banner" role="status">
            <span>
              {networkError ||
                "Connect to Waku so someone with your invite can message you."}
            </span>
            <button className="primary" onClick={connect}>
              Connect to Waku
            </button>
          </div>
        )}
        {identity && requests.length > 0 && (
          <section
            className="contact-requests"
            aria-labelledby="requests-title"
          >
            <h2 id="requests-title">Contact requests</h2>
            <p>
              These senders have verified signatures. Accept a request to reply
              without exchanging another invite.
            </p>
            {requests.map((request) => (
              <form
                key={request.address}
                className="contact-request"
                onSubmit={(event) => {
                  event.preventDefault();
                  const name = String(
                    new FormData(event.currentTarget).get("name") || "",
                  ).trim();
                  if (name) addContact({ ...request, name });
                }}
              >
                <p className="wrap-address">{request.address}</p>
                <label htmlFor={"request-" + request.address}>
                  Contact name
                </label>
                <input
                  id={"request-" + request.address}
                  name="name"
                  defaultValue={request.name}
                  maxLength={40}
                  required
                />
                <div className="request-actions">
                  <button className="primary">Accept and open chat</button>
                  <button
                    type="button"
                    onClick={() => {
                      if (ignoredSenders.current.size < 1000)
                        ignoredSenders.current.add(request.address);
                      setRequests((old) =>
                        old.filter((r) => r.address !== request.address),
                      );
                      setMessages((old) =>
                        old.filter((m) => m.from !== request.address),
                      );
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </form>
            ))}
          </section>
        )}
        <div id="main" tabIndex={-1}>
          {!identity ? (
            <IdentitySetup onReady={ready} />
          ) : screen === "invites" ? (
            <Invites identity={identity} onAdd={addContact} notify={setToast} />
          ) : (
            <ChatWorkspace
              key={activeAddress}
              initialContact={activeAddress}
              identity={identity}
              contacts={contacts}
              messages={messages}
              drafts={drafts}
              setDrafts={setDrafts}
              status={status}
              networkError={networkError}
              onConnect={connect}
              onDisconnect={() => setWantConnection(false)}
              onSend={send}
              onInvites={() => setScreen("invites")}
              onLock={() => setLock(true)}
              notify={setToast}
            />
          )}
        </div>
        <footer className="footer">
          <span>MA Solution @2026</span>
          <span>Local first</span>
        </footer>
      </div>
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
      {lock && (
        <Modal title="Lock this identity?" onClose={() => setLock(false)}>
          <p>
            This disconnects Waku and clears the current conversation history
            from memory. Your contacts and identity name remain on this device.
            You’ll need your backed-up private key to unlock again.
          </p>
          <button className="primary" onClick={doLock}>
            Lock identity
          </button>
        </Modal>
      )}
    </>
  );
}
