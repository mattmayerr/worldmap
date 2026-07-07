"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { OBJECTION_CATEGORY_LABELS } from "@/lib/objection-library";
import { normalizeObjectionKey } from "@/lib/objection-utils";
import type { ObjectionCategory } from "@/lib/types";

interface LibraryObjection {
  id: string;
  text: string;
  category: ObjectionCategory;
  source: string;
}

interface CategoryGroup {
  id: ObjectionCategory;
  label: string;
  objections: LibraryObjection[];
}

interface PerformanceRow {
  objectionKey: string;
  objectionText: string;
  category: ObjectionCategory;
  attempts: number;
  averageScore: number | null;
  bestScore: number | null;
  lastPracticedAt: string | null;
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 7) return "text-emerald-400";
  if (score >= 5) return "text-amber-400";
  return "text-red-400";
}

export default function ObjectionsPage() {
  const [categories, setCategories] = useState<CategoryGroup[]>([]);
  const [performance, setPerformance] = useState<PerformanceRow[]>([]);
  const [poolSize, setPoolSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ObjectionCategory | "all">("all");

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch("/api/practice/objections/status?count=5&shuffle=0");
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);

        setCategories(data.categories ?? []);
        setPerformance(data.performance ?? []);
        setPoolSize(data.poolSize ?? 0);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, []);

  const perfMap = new Map(performance.map((row) => [row.objectionKey, row]));

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading objection library...
      </div>
    );
  }

  const visibleCategories =
    filter === "all" ? categories : categories.filter((group) => group.id === filter);

  return (
    <div className="h-screen overflow-y-auto px-4 py-8 md:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-white">Objection library</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-400">
              {poolSize} B2C objections organized by type — from common warranty and protection-plan
              research. Practice sessions randomly pick 5; drill specific weaknesses here.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-500"
          >
            Back to practice
          </Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-xs ${
              filter === "all"
                ? "bg-accent/20 text-white ring-1 ring-accent/40"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          {categories.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setFilter(group.id)}
              className={`rounded-lg px-3 py-1.5 text-xs ${
                filter === group.id
                  ? "bg-accent/20 text-white ring-1 ring-accent/40"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {group.label}
            </button>
          ))}
        </div>

        <div className="space-y-8">
          {visibleCategories.map((group) => (
            <section
              key={group.id}
              className="rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border"
            >
              <h2 className="text-sm font-semibold text-white">{group.label}</h2>
              <ul className="mt-4 space-y-2">
                {group.objections.map((objection) => {
                  const key = normalizeObjectionKey(objection.text);
                  const stats = perfMap.get(key);

                  return (
                    <li
                      key={objection.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface px-4 py-3 ring-1 ring-surface-border"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-slate-200">{objection.text}</p>
                        {stats && stats.attempts > 0 && (
                          <p className="mt-1 text-xs text-slate-500">
                            Practiced {stats.attempts} times
                            {stats.averageScore !== null &&
                              ` · avg ${stats.averageScore}/10 · best ${stats.bestScore}/10`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        {stats?.averageScore !== undefined && stats.attempts > 0 && (
                          <span
                            className={`text-sm font-semibold ${scoreColor(stats.averageScore)}`}
                          >
                            {stats.averageScore}/10
                          </span>
                        )}
                        <Link
                          href={`/?focus=${encodeURIComponent(objection.id)}`}
                          className="shrink-0 rounded-lg bg-accent/20 px-3 py-1.5 text-xs font-medium text-accent ring-1 ring-accent/30 hover:bg-accent/30"
                        >
                          Practice
                        </Link>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
