"use client";

import { useEffect, useState } from "react";

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

type ApiConversation = {
  id: string;
  organizationId: string;
  status: string;
  createdAt: string;
  customer: ApiCustomer;
  channel: ApiChannel;
  messages: ApiMessage[];
};

export default function InboxPage() {
  const [conversations, setConversations] = useState<ApiConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/conversations");
        if (!res.ok) {
          throw new Error(`Request failed (${res.status})`);
        }
        const data: { conversations: ApiConversation[] } = await res.json();
        if (cancelled) return;
        setConversations(data.conversations);
        setSelectedId(data.conversations[0]?.id ?? null);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load inbox");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const selected = conversations.find((c) => c.id === selectedId) ?? null;

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

        {/* Messages */}
        <div className="min-w-0 flex-1 overflow-y-auto p-3">
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

        {/* Customer */}
        <div className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-l border-border p-3 text-sm">
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
            </>
          ) : (
            <p className="text-muted-foreground">—</p>
          )}
        </div>
      </div>
    </div>
  );
}
