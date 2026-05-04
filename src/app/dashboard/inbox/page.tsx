"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";

type ApiMessage = {
  id: string;
  content: string;
  direction: string;
  senderType: string;
  createdAt: string;
};

type ApiCustomer = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
};

type ApiChannel = {
  id: string;
  name: string;
  type: string;
};

type ApiNote = {
  id: string;
  content: string;
  createdAt: string;
};

type ApiConversation = {
  id: string;
  organizationId: string;
  status: string;
  createdAt: string;
  customer: ApiCustomer;
  channel: ApiChannel;
  messages: ApiMessage[];
  notes: ApiNote[];
};

function mergeMessages(existing: ApiMessage[], incoming: ApiMessage[]): ApiMessage[] {
  const map = new Map<string, ApiMessage>();
  for (const m of existing) {
    map.set(m.id, m);
  }
  for (const m of incoming) {
    map.set(m.id, m);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeNotes(existing: ApiNote[], incoming: ApiNote[]): ApiNote[] {
  const map = new Map<string, ApiNote>();
  for (const n of existing) {
    map.set(n.id, n);
  }
  for (const n of incoming) {
    map.set(n.id, n);
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function mergeConversation(
  previous: ApiConversation | undefined,
  incoming: ApiConversation,
): ApiConversation {
  if (!previous) {
    return {
      ...incoming,
      notes: incoming.notes ?? [],
    };
  }
  return {
    ...incoming,
    notes: mergeNotes(previous.notes ?? [], incoming.notes ?? []),
    messages: mergeMessages(previous.messages, incoming.messages),
  };
}

const POLL_MS = 3000;

const STATUS_OPTIONS = ["OPEN", "PENDING", "CLOSED"] as const;

export default function InboxPage() {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [noteSaving, setNoteSaving] = useState(false);

  const conversationsRef = useRef(conversations);
  const selectedIdRef = useRef(selectedId);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  useEffect(() => {
    selectedIdRef.current = selectedId;
  }, [selectedId]);

  useEffect(() => {
    let cancelled = false;

    async function fetchInbox(isInitial: boolean) {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data: { conversations: ApiConversation[] } = await res.json();
        if (cancelled) return;

        const prev = conversationsRef.current;
        const merged = data.conversations.map((serverConv) => {
          const old = prev.find((c) => c.id === serverConv.id);
          return mergeConversation(old, serverConv);
        });

        const prevSel = selectedIdRef.current;
        const nextSel =
          prevSel && merged.some((c) => c.id === prevSel) ? prevSel : (merged[0]?.id ?? null);

        setConversations(merged);
        setSelectedId(nextSel);
        setError(null);
      } catch (e) {
        if (!cancelled && isInitial) {
          setError(e instanceof Error ? e.message : "Failed to load inbox");
        }
      } finally {
        if (!cancelled && isInitial) {
          setLoading(false);
        }
      }
    }

    void fetchInbox(true);
    const intervalId = window.setInterval(() => void fetchInbox(false), POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    setDraft("");
    setNoteDraft("");
  }, [selectedId]);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  async function handleStatusChange(nextStatus: string) {
    if (!selectedId || !selected || nextStatus === selected.status || statusUpdating) return;

    setStatusUpdating(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (!res.ok) return;

      const data: { conversation: ApiConversation } = await res.json();

      setConversations((prev) =>
        prev.map((c) =>
          c.id === data.conversation.id ? mergeConversation(c, data.conversation) : c,
        ),
      );
    } finally {
      setStatusUpdating(false);
    }
  }

  async function handleAddNote(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId || !noteDraft.trim() || noteSaving) return;

    setNoteSaving(true);
    try {
      const res = await fetch(`/api/conversations/${selectedId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: noteDraft.trim() }),
      });

      if (!res.ok) return;

      const data: { note: ApiNote } = await res.json();

      setConversations((prev) =>
        prev.map((c) =>
          c.id === selectedId
            ? { ...c, notes: mergeNotes(c.notes ?? [], [data.note]) }
            : c,
        ),
      );
      setNoteDraft("");
    } finally {
      setNoteSaving(false);
    }
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;

    setSending(true);
    try {
      const res = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: selectedId,
          content: draft.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error(`Send failed (${res.status})`);
      }

      const created: ApiMessage = await res.json();

      setConversations((prev) =>
        prev.map((c) => (c.id === selectedId ? { ...c, messages: mergeMessages(c.messages, [created]) } : c)),
      );
      setDraft("");
    } catch {
      // kept minimal per requirements
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-semibold">Inbox</h1>

      <div className="flex min-h-[28rem] gap-0 border border-border">
        {/* Conversations list */}
        <div className="flex w-64 shrink-0 flex-col overflow-y-auto border-r border-border p-2">
          {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading &&
            !error &&
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedId(c.id)}
                className={
                  "w-full rounded px-2 py-2 text-left text-sm " +
                  (c.id === selectedId ? "bg-muted" : "hover:bg-muted/60")
                }
              >
                <div className="font-medium">{c.customer.name}</div>
                <div className="text-muted-foreground text-xs">
                  {c.status} · {c.channel.name}
                </div>
              </button>
            ))}
          {!loading && !error && conversations.length === 0 && (
            <p className="text-muted-foreground text-sm">No conversations.</p>
          )}
        </div>

        {/* Messages + compose */}
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {!selected && !loading && <p className="text-muted-foreground text-sm">Select a conversation.</p>}
            {selected && (
              <ul className="flex flex-col gap-2">
                {selected.messages.map((m) => (
                  <li key={m.id} className="rounded border border-border px-2 py-1 text-sm">
                    <div className="text-muted-foreground text-xs">
                      {m.direction} · {m.senderType} · {new Date(m.createdAt).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{m.content}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selected && (
            <form onSubmit={(e) => void handleSend(e)} className="flex shrink-0 gap-2 border-t border-border p-2">
              <input
                name="content"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                className="border-input flex-1 rounded border bg-background px-2 py-1 text-sm"
                placeholder="Reply…"
                autoComplete="off"
                disabled={sending}
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="rounded border border-border bg-muted px-3 py-1 text-sm font-medium disabled:opacity-50"
              >
                Send
              </button>
            </form>
          )}
        </div>

        {/* Customer + status + notes */}
        <div className="flex w-72 shrink-0 flex-col gap-3 overflow-y-auto border-l border-border p-3 text-sm">
          <div className="font-medium">Customer</div>
          {selected ? (
            <>
              <div>
                <span className="text-muted-foreground">Name: </span>
                {selected.customer.name}
              </div>
              <div>
                <span className="text-muted-foreground">Email: </span>
                {selected.customer.email ?? "—"}
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="conversation-status" className="text-muted-foreground">
                  Status
                </label>
                <select
                  id="conversation-status"
                  value={selected.status}
                  disabled={statusUpdating}
                  onChange={(e) => void handleStatusChange(e.target.value)}
                  className="border-input rounded border bg-background px-2 py-1 text-sm disabled:opacity-50"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-border mt-1 border-t pt-3">
                <div className="mb-2 font-medium">Internal notes</div>
                <ul className="mb-2 max-h-40 space-y-2 overflow-y-auto">
                  {(selected.notes ?? []).length === 0 ? (
                    <li className="text-muted-foreground text-xs">No notes yet.</li>
                  ) : (
                    (selected.notes ?? []).map((n) => (
                      <li key={n.id} className="rounded border border-border px-2 py-1 text-xs">
                        <div className="text-muted-foreground">{new Date(n.createdAt).toLocaleString()}</div>
                        <div className="mt-0.5 whitespace-pre-wrap">{n.content}</div>
                      </li>
                    ))
                  )}
                </ul>
                <form onSubmit={(e) => void handleAddNote(e)} className="flex flex-col gap-2">
                  <textarea
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    rows={3}
                    placeholder="Add an internal note…"
                    disabled={noteSaving}
                    className="border-input resize-y rounded border bg-background px-2 py-1 text-xs disabled:opacity-50"
                  />
                  <button
                    type="submit"
                    disabled={noteSaving || !noteDraft.trim()}
                    className="rounded border border-border bg-muted px-2 py-1 text-xs font-medium disabled:opacity-50"
                  >
                    Add note
                  </button>
                </form>
              </div>
            </>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
