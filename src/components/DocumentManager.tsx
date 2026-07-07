"use client";

import { useCallback, useEffect, useState } from "react";
import type { StoredDocument } from "@/lib/types";

const ACCEPTED_TYPES = ".pdf,.csv,.txt,.md,.json";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentManager() {
  const [documents, setDocuments] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [importingUrl, setImportingUrl] = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState("https://everythingbreaks.com/");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/documents");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to load documents.");
      setDocuments(data.documents);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDocuments();
  }, [loadDocuments]);

  async function uploadFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList);
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    setSuccess(null);

    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || `Failed to upload ${file.name}.`);
        }
      }

      await loadDocuments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function importWebsite() {
    const url = websiteUrl.trim();
    if (!url || importingUrl) return;

    setImportingUrl(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch("/api/documents/import-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Website import failed.");
      }

      await loadDocuments();
      setSuccess(`Imported ${data.document.name}. Re-importing the same URL will refresh it.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Website import failed.");
    } finally {
      setImportingUrl(false);
    }
  }

  async function removeDocument(id: string) {
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Delete failed.");
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <h2 className="text-2xl font-semibold text-white">Knowledge base</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Upload PDFs, CSVs, and text files — or import your company website. The assistant uses
          these in practice, coach, and knowledge modes.
        </p>
      </div>

      {success && (
        <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          {success}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="mb-8 rounded-2xl bg-surface-raised p-5 ring-1 ring-surface-border">
        <h3 className="text-sm font-medium text-white">Import from website</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-500">
          Pull public content from your company site into the knowledge base. Re-import to refresh.
        </p>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row"
          onSubmit={(event) => {
            event.preventDefault();
            void importWebsite();
          }}
        >
          <input
            type="url"
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            placeholder="https://everythingbreaks.com/"
            className="flex-1 rounded-xl border border-surface-border bg-surface px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-accent/50"
          />
          <button
            type="submit"
            disabled={importingUrl || !websiteUrl.trim()}
            className="rounded-xl bg-accent px-5 py-3 text-sm font-medium text-white transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {importingUrl ? "Importing..." : "Import website"}
          </button>
        </form>
      </div>

      <label
        className={`mb-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 transition ${
          dragOver
            ? "border-accent bg-accent/10"
            : "border-surface-border bg-surface-raised/50 hover:border-accent/50"
        }`}
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          void uploadFiles(event.dataTransfer.files);
        }}
      >
        <input
          type="file"
          className="hidden"
          accept={ACCEPTED_TYPES}
          multiple
          onChange={(event) => {
            if (event.target.files) void uploadFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <div className="text-3xl">📄</div>
        <p className="mt-3 text-sm font-medium text-white">
          {uploading ? "Uploading..." : "Drop files here or click to browse"}
        </p>
        <p className="mt-1 text-xs text-slate-500">PDF, CSV, TXT, MD, JSON</p>
      </label>

      <div className="rounded-2xl bg-surface-raised ring-1 ring-surface-border">
        <div className="border-b border-surface-border px-5 py-4">
          <h3 className="text-sm font-medium text-white">
            Uploaded documents ({documents.length})
          </h3>
        </div>

        {loading ? (
          <div className="px-5 py-8 text-sm text-slate-500">Loading...</div>
        ) : documents.length === 0 ? (
          <div className="px-5 py-8 text-sm text-slate-500">
            No documents yet. Upload product sheets, pricing CSVs, scripts, or FAQs.
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {documents.map((doc) => (
              <li key={doc.id} className="flex items-start gap-4 px-5 py-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-white">{doc.name}</span>
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs text-slate-400">
                      {doc.type === ".website" ? "website" : doc.type}
                    </span>
                    <span className="text-xs text-slate-500">{formatBytes(doc.size)}</span>
                  </div>
                  {doc.sourceUrl && (
                    <p className="mt-1 text-xs text-slate-500 truncate">{doc.sourceUrl}</p>
                  )}
                  <p className="mt-1 text-xs leading-relaxed text-slate-500">{doc.excerpt}...</p>
                </div>
                <button
                  type="button"
                  onClick={() => void removeDocument(doc.id)}
                  className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-red-300 transition hover:bg-red-500/10"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
