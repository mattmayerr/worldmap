import fs from "fs/promises";
import path from "path";
import { parse as parseCsv } from "csv-parse/sync";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { ensureDataDir } from "./profile";
import type { StoredDocument } from "./types";

const DOCS_DIR = path.join(process.cwd(), "data", "documents");
const INDEX_PATH = path.join(DOCS_DIR, "index.json");
const MAX_CONTEXT_CHARS = 14000;
const EXCERPT_LENGTH = 280;

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".json", ".csv"]);

async function readIndex(): Promise<StoredDocument[]> {
  try {
    const raw = await fs.readFile(INDEX_PATH, "utf-8");
    return JSON.parse(raw) as StoredDocument[];
  } catch {
    return [];
  }
}

async function writeIndex(documents: StoredDocument[]): Promise<void> {
  await fs.writeFile(INDEX_PATH, JSON.stringify(documents, null, 2), "utf-8");
}

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === ".pdf") {
    const parsed = await pdf(buffer);
    return parsed.text.trim();
  }

  if (ext === ".csv") {
    const raw = buffer.toString("utf-8");
    const rows = parseCsv(raw, {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Record<string, string>[];

    if (rows.length === 0) {
      return raw.trim();
    }

    const headers = Object.keys(rows[0]);
    const preview = rows.slice(0, 50).map((row, i) => {
      const fields = headers.map((h) => `${h}: ${row[h] ?? ""}`).join(" | ");
      return `Row ${i + 1}: ${fields}`;
    });

    const suffix =
      rows.length > 50 ? `\n\n... ${rows.length - 50} additional rows omitted ...` : "";

    return `CSV columns: ${headers.join(", ")}\n\n${preview.join("\n")}${suffix}`;
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported file type: ${ext || "unknown"}`);
}

export async function listDocuments(): Promise<StoredDocument[]> {
  await ensureDataDir();
  await fs.mkdir(DOCS_DIR, { recursive: true });
  return readIndex();
}

export async function getDocumentText(id: string): Promise<string | null> {
  const filePath = path.join(DOCS_DIR, `${id}.txt`);
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

export async function saveDocument(
  filename: string,
  buffer: Buffer
): Promise<StoredDocument> {
  await ensureDataDir();
  await fs.mkdir(DOCS_DIR, { recursive: true });

  const text = await extractText(buffer, filename);
  if (!text) {
    throw new Error("Could not extract text from this file.");
  }

  const id = uuidv4();
  const storedPath = path.join(DOCS_DIR, `${id}.txt`);
  await fs.writeFile(storedPath, text, "utf-8");

  const doc: StoredDocument = {
    id,
    name: filename,
    type: path.extname(filename).toLowerCase() || ".unknown",
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
    excerpt: text.slice(0, EXCERPT_LENGTH).replace(/\s+/g, " "),
    charCount: text.length,
  };

  const index = await readIndex();
  index.unshift(doc);
  await writeIndex(index);

  return doc;
}

export async function deleteDocument(id: string): Promise<boolean> {
  const index = await readIndex();
  const next = index.filter((doc) => doc.id !== id);
  if (next.length === index.length) {
    return false;
  }

  await writeIndex(next);
  await fs.unlink(path.join(DOCS_DIR, `${id}.txt`)).catch(() => undefined);
  return true;
}

export async function buildDocumentContext(): Promise<string> {
  const docs = await listDocuments();
  if (docs.length === 0) {
    return "";
  }

  const sections: string[] = [];
  let totalChars = 0;

  for (const doc of docs) {
    const text = await getDocumentText(doc.id);
    if (!text) continue;

    const header = `--- ${doc.name} (${doc.type}) ---`;
    const remaining = MAX_CONTEXT_CHARS - totalChars - header.length - 2;
    if (remaining <= 0) break;

    const chunk = text.slice(0, remaining);
    sections.push(`${header}\n${chunk}`);
    totalChars += header.length + chunk.length + 2;

    if (totalChars >= MAX_CONTEXT_CHARS) break;
  }

  return sections.join("\n\n");
}
