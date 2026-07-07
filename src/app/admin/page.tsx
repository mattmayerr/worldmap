"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { TeamMetrics } from "@/lib/practice-sessions";
import type { User } from "@/lib/types";
import { AdminObjectionStatsPanel } from "@/components/AdminObjectionStatsPanel";

export default function AdminPage() {
  const router = useRouter();
  const [metrics, setMetrics] = useState<TeamMetrics | null>(null);
  const [users, setUsers] = useState<Omit<User, "passwordHash">[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState<string | null>(null);
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [metricsRes, usersRes] = await Promise.all([
        fetch("/api/admin/metrics"),
        fetch("/api/admin/users"),
      ]);

      const metricsData = await metricsRes.json();
      const usersData = await usersRes.json();

      if (metricsRes.status === 403 || usersRes.status === 403) {
        router.push("/");
        return;
      }

      if (!metricsRes.ok) throw new Error(metricsData.error || "Failed to load metrics.");
      if (!usersRes.ok) throw new Error(usersData.error || "Failed to load users.");

      setMetrics(metricsData.metrics);
      setUsers(usersData.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load admin data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function createAgent(event: FormEvent) {
    event.preventDefault();
    setCreating(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "agent" }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to create agent.");

      setForm({ name: "", email: "", password: "" });
      setMessage(`Created account for ${data.user.email}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create agent.");
    } finally {
      setCreating(false);
    }
  }

  function openPasswordReset(userId: string) {
    setResetUserId(userId);
    setResetPassword("");
    setError(null);
    setMessage(null);
  }

  function cancelPasswordReset() {
    setResetUserId(null);
    setResetPassword("");
  }

  async function submitPasswordReset(event: FormEvent, userId: string) {
    event.preventDefault();
    if (resetPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setResetting(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/admin/users/${userId}/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to reset password.");

      const user = users.find((item) => item.id === userId);
      setMessage(`Password updated for ${user?.email ?? "user"}. They can log in with the new password.`);
      cancelPasswordReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset password.");
    } finally {
      setResetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading admin dashboard...
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 md:px-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white">Admin dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Team-wide practice trends, agent performance, and account management.
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        )}
        {message && (
          <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {message}
          </div>
        )}

        {metrics && (
          <>
            <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "Total sessions", value: metrics.totalSessions },
                { label: "Active agents (7d)", value: metrics.activeAgentsLast7Days },
                { label: "Sessions (7d)", value: metrics.sessionsLast7Days },
                {
                  label: "Team avg score",
                  value: metrics.averageScore !== null ? `${metrics.averageScore}/10` : "—",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border"
                >
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="mb-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
                <h2 className="text-sm font-semibold text-white">Agent performance</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="text-xs text-slate-500">
                      <tr>
                        <th className="pb-2 pr-4">Agent</th>
                        <th className="pb-2 pr-4">Sessions</th>
                        <th className="pb-2 pr-4">Avg score</th>
                        <th className="pb-2">Weak obj. %</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-300">
                      {metrics.agentSummaries.map((agent) => (
                        <tr key={agent.userId} className="border-t border-surface-border">
                          <td className="py-3 pr-4">
                            <div className="font-medium text-white">{agent.userName}</div>
                            <div className="text-xs text-slate-500">{agent.email}</div>
                          </td>
                          <td className="py-3 pr-4">{agent.sessionCount}</td>
                          <td className="py-3 pr-4">
                            {agent.averageScore !== null ? `${agent.averageScore}/10` : "—"}
                          </td>
                          <td className="py-3">{agent.weakObjectionRate}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
                <h2 className="text-sm font-semibold text-white">Weakest objections (team)</h2>
                <ul className="mt-4 space-y-3">
                  {metrics.topWeakObjections.length === 0 ? (
                    <li className="text-sm text-slate-500">No objection data yet.</li>
                  ) : (
                    metrics.topWeakObjections.map((item) => (
                      <li
                        key={item.text}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="text-slate-300">{item.text}</span>
                        <span className="shrink-0 text-amber-400">
                          {item.averageScore}/10 · {item.count}x
                        </span>
                      </li>
                    ))
                  )}
                </ul>
              </section>
            </div>

            {metrics.scoreTrend.length > 0 && (
              <section className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
                <h2 className="text-sm font-semibold text-white">Score trend (recent days)</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  {metrics.scoreTrend.map((point) => (
                    <div
                      key={point.date}
                      className="rounded-xl bg-surface px-4 py-3 text-center ring-1 ring-surface-border"
                    >
                      <p className="text-xs text-slate-500">{point.date}</p>
                      <p className="mt-1 text-lg font-semibold text-white">{point.averageScore}</p>
                      <p className="text-xs text-slate-500">{point.sessionCount} sessions</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <AdminObjectionStatsPanel />

        <section className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
          <h2 className="text-sm font-semibold text-white">Create agent account</h2>
          <p className="mt-1 text-xs text-slate-500">
            Agents can log in from home or work — their practice sessions are saved to their account.
          </p>
          <form onSubmit={createAgent} className="mt-4 grid gap-4 sm:grid-cols-3">
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Full name"
              required
              className="rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
            />
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
              placeholder="Email"
              required
              className="rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
            />
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="Password (min 8 chars)"
              required
              minLength={8}
              className="rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              type="submit"
              disabled={creating}
              className="sm:col-span-3 rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create agent account"}
            </button>
          </form>

          {users.length > 0 && (
            <div className="mt-6">
              <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
                All accounts ({users.length})
              </h3>
              <ul className="mt-3 space-y-2">
                {users.map((user) => (
                  <li
                    key={user.id}
                    className="rounded-xl bg-surface px-4 py-3 text-sm ring-1 ring-surface-border"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-white">{user.name}</span>
                        <span className="ml-2 text-slate-500">{user.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            resetUserId === user.id
                              ? cancelPasswordReset()
                              : openPasswordReset(user.id)
                          }
                          className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-300 ring-1 ring-surface-border transition hover:bg-white/[0.04] hover:text-white"
                        >
                          {resetUserId === user.id ? "Cancel" : "Reset password"}
                        </button>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${
                            user.role === "admin"
                              ? "bg-violet-500/20 text-violet-200"
                              : "bg-slate-500/20 text-slate-300"
                          }`}
                        >
                          {user.role}
                        </span>
                      </div>
                    </div>

                    {resetUserId === user.id && (
                      <form
                        onSubmit={(event) => void submitPasswordReset(event, user.id)}
                        className="mt-4 flex flex-col gap-3 border-t border-surface-border pt-4 sm:flex-row sm:items-end"
                      >
                        <label className="flex-1">
                          <span className="mb-1.5 block text-xs text-slate-500">New password</span>
                          <input
                            type="password"
                            value={resetPassword}
                            onChange={(event) => setResetPassword(event.target.value)}
                            placeholder="Min 8 characters"
                            required
                            minLength={8}
                            autoFocus
                            className="w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-2.5 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
                          />
                        </label>
                        <button
                          type="submit"
                          disabled={resetting || resetPassword.length < 8}
                          className="rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                        >
                          {resetting ? "Saving..." : "Set new password"}
                        </button>
                      </form>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
