"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminKnowledgeEntry } from "@/lib/types";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function AdminKnowledgePanel() {
  const [entries, setEntries] = useState<AdminKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/knowledge");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load knowledge.");
      setEntries(data.entries ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load knowledge.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadEntries();
  }, [loadEntries]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmedBody = body.trim();
    if (!trimmedBody || submitting) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/admin/knowledge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), body: trimmedBody }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to add knowledge.");

      setEntries(data.entries ?? []);
      setTitle("");
      setBody("");
      setSuccess("Knowledge added. The AI will use this in practice, coach, and knowledge modes.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add knowledge.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    if (removingId) return;

    setRemovingId(id);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch(`/api/admin/knowledge?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to remove entry.");

      setEntries(data.entries ?? []);
      setSuccess("Entry removed.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove entry.");
    } finally {
      setRemovingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-violet-500/30 bg-violet-500/5 p-5">
      <h3 className="text-sm font-semibold text-violet-200">Internal company knowledge</h3>
      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        Add policies, exceptions, and talk tracks the AI must know. Each entry is saved when you
        submit — agents never see this section, but the AI uses it behind the scenes.
      </p>

      {success && (
        <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-300">Topic (optional)</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Florida quoting rules, Senior discount, Claims process"
            className="w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium text-slate-300">What should the AI know?</span>
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            placeholder="In Florida we cannot quote Home Diamond online — always warm-transfer to a licensed rep."
            className="w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-violet-500/40"
          />
        </label>

        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Adding..." : "Add to knowledge base"}
        </button>
      </form>

      <div className="mt-6 border-t border-white/[0.06] pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Saved entries ({entries.length})
          </p>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading entries...</p>
        ) : entries.length === 0 ? (
          <p className="rounded-xl bg-white/[0.03] px-4 py-4 text-sm text-slate-500">
            No entries yet. Add your first fact above — it will be saved immediately when you submit.
          </p>
        ) : (
          <ul className="space-y-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-xl border border-white/[0.06] bg-surface-raised px-4 py-3.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    {entry.title ? (
                      <p className="text-sm font-semibold text-white">{entry.title}</p>
                    ) : null}
                    <p className={`text-sm leading-relaxed text-slate-300 ${entry.title ? "mt-1" : ""}`}>
                      {entry.body}
                    </p>
                    <p className="mt-2 text-[10px] text-slate-600">Added {formatDate(entry.createdAt)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleRemove(entry.id)}
                    disabled={removingId === entry.id}
                    className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:opacity-50"
                  >
                    {removingId === entry.id ? "Removing..." : "Remove"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
