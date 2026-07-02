"use client";

import { useEffect, useRef, useState } from "react";
import type { ChatMessage, ChatMode } from "@/lib/types";

const MODE_META: Record<
  ChatMode,
  { label: string; subtitle: string; placeholder: string; starter: string }
> = {
  practice: {
    label: "Practice",
    subtitle: "Role-play with a simulated prospect",
    placeholder: "Start the call, handle an objection, or ask for the sale...",
    starter:
      "Hi — thanks for taking the time. I am still evaluating options, so I will need you to earn my attention.",
  },
  coach: {
    label: "Coach",
    subtitle: "Ask how to handle a situation",
    placeholder: "Describe a deal, objection, or scenario you want help with...",
    starter:
      "Tell me about a sales situation you are facing. I will help you think through the best approach.",
  },
};

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-accent text-white"
            : "bg-surface-raised text-slate-100 ring-1 ring-surface-border"
        }`}
      >
        {message.content}
      </div>
    </div>
  );
}

export function Chat() {
  const [mode, setMode] = useState<ChatMode>("practice");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const meta = MODE_META[mode];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  function switchMode(next: ChatMode) {
    setMode(next);
    setMessages([]);
    setError(null);
    setInput("");
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();
    if (!trimmed || loading) return;

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, messages: nextMessages }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "Failed to get a response.");
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response stream available.");
      }

      const decoder = new TextDecoder();
      let assistantText = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        assistantText += decoder.decode(value, { stream: true });
        const snapshot = assistantText;

        setMessages((prev) => {
          const copy = [...prev];
          copy[copy.length - 1] = { role: "assistant", content: snapshot };
          return copy;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setError(message);
      setMessages((prev) =>
        prev[prev.length - 1]?.role === "assistant" && prev[prev.length - 1]?.content === ""
          ? prev.slice(0, -1)
          : prev
      );
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div className="flex h-screen flex-col">
      <header className="border-b border-surface-border bg-surface-raised/60 px-4 py-4 backdrop-blur md:px-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">{meta.label} mode</h2>
            <p className="text-sm text-slate-400">{meta.subtitle}</p>
          </div>

          <div className="flex rounded-xl bg-surface p-1 ring-1 ring-surface-border">
            {(Object.keys(MODE_META) as ChatMode[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => switchMode(key)}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  mode === key
                    ? "bg-accent text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {MODE_META[key].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center gap-6 py-16 text-center">
            <div className="rounded-2xl bg-surface-raised px-6 py-5 ring-1 ring-surface-border">
              <p className="text-sm leading-relaxed text-slate-300">{meta.starter}</p>
            </div>
            <button
              type="button"
              onClick={() => void sendMessage("Let's begin.")}
              className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-500"
            >
              Start conversation
            </button>
          </div>
        ) : (
          <div className="mx-auto flex max-w-3xl flex-col gap-4">
            {messages.map((message, index) => (
              <MessageBubble key={`${message.role}-${index}`} message={message} />
            ))}
            {loading && (
              <div className="text-sm text-slate-500">
                {mode === "practice" ? "Prospect is thinking..." : "Coach is thinking..."}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <footer className="border-t border-surface-border bg-surface-raised/60 px-4 py-4 backdrop-blur md:px-8">
        {error && (
          <div className="mb-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mx-auto flex max-w-3xl gap-3">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void sendMessage(input);
              }
            }}
            rows={2}
            placeholder={meta.placeholder}
            className="flex-1 resize-none rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white outline-none ring-accent/0 transition focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="self-end rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Send
          </button>
        </form>
      </footer>
    </div>
  );
}
