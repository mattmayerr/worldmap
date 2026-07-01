"use client";

import { useEffect, useState } from "react";
import { DEFAULT_PROFILE, type BusinessProfile } from "@/lib/types";

const FIELDS: Array<{
  key: keyof BusinessProfile;
  label: string;
  placeholder: string;
  rows?: number;
}> = [
  {
    key: "businessName",
    label: "Business name",
    placeholder: "Acme Solutions",
  },
  {
    key: "productOrService",
    label: "Product or service",
    placeholder: "What you sell and the problem it solves",
    rows: 3,
  },
  {
    key: "targetCustomer",
    label: "Target customer",
    placeholder: "Who you sell to — role, industry, company size",
    rows: 3,
  },
  {
    key: "valueProposition",
    label: "Value proposition",
    placeholder: "Why customers choose you over alternatives",
    rows: 3,
  },
  {
    key: "commonObjections",
    label: "Common objections",
    placeholder: "Price too high, already have a vendor, need to think about it...",
    rows: 3,
  },
  {
    key: "salesStage",
    label: "Default sales stage",
    placeholder: "discovery, demo, negotiation, closing",
  },
  {
    key: "tone",
    label: "Preferred sales tone",
    placeholder: "professional, friendly, consultative, direct",
  },
];

export function SettingsForm() {
  const [profile, setProfile] = useState<BusinessProfile>(DEFAULT_PROFILE);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/profile");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to load profile.");
        setProfile(data.profile);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load profile.");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to save profile.");
      setProfile(data.profile);
      setMessage("Business profile saved. Chat responses will use this context.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save profile.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-slate-500">Loading...</div>;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">Business profile</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Configure the basics so practice scenarios and coaching advice match your real sales
          motion. Combine this with uploaded documents for the best results.
        </p>
      </div>

      {message && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {message}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {FIELDS.map((field) => (
          <label key={field.key} className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">{field.label}</span>
            {field.rows ? (
              <textarea
                value={profile[field.key]}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                rows={field.rows}
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
              />
            ) : (
              <input
                value={profile[field.key]}
                onChange={(event) =>
                  setProfile((prev) => ({ ...prev, [field.key]: event.target.value }))
                }
                placeholder={field.placeholder}
                className="w-full rounded-xl border border-surface-border bg-surface-raised px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
              />
            )}
          </label>
        ))}

        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save profile"}
        </button>
      </form>

      <div className="mt-10 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
        <h3 className="text-sm font-medium text-white">Setup checklist</h3>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-400">
          <li>Copy <code className="text-slate-300">.env.example</code> to <code className="text-slate-300">.env.local</code> and add your OpenAI API key.</li>
          <li>Fill in your business profile on this page.</li>
          <li>Upload PDFs and CSVs on the Documents page.</li>
          <li>Use Practice mode to role-play, or Coach mode to ask for advice.</li>
        </ol>
      </div>
    </div>
  );
}
