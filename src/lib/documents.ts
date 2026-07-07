import fs from "fs/promises";
import path from "path";
import { parse as parseCsv } from "csv-parse/sync";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";
import { ensureDataDir } from "./profile";
import { tokenize } from "./profile-utils";
import { fetchWebsiteContent } from "./website";
import type { StoredDocument } from "./types";

const DOCS_DIR = path.join(process.cwd(), "data", "documents");
const INDEX_PATH = path.join(DOCS_DIR, "index.json");
const MAX_CONTEXT_CHARS = 20000;
const CHUNK_TARGET = 1800;
const EXCERPT_LENGTH = 280;

const PLAN_NAMES = ["standard", "enhanced", "deluxe", "topline", "critical", "home"] as const;

const COVERAGE_QUERY_PATTERN =
  /\b(cover|coverage|covered|include|included|component|components)\b/i;

const COMPONENT_SECTION_PATTERN =
  /\b(covered components|electrical components|components covered)\b/i;

const TEXT_EXTENSIONS = new Set([".txt", ".md", ".json", ".csv"]);

const SALES_KEYWORDS = new Set([
  "coverage",
  "covered",
  "deductible",
  "price",
  "pricing",
  "fee",
  "cost",
  "monthly",
  "plan",
  "warranty",
  "claim",
  "claims",
  "repair",
  "maximum",
  "limit",
  "included",
  "excluded",
  "benefit",
  "benefits",
  "standard",
  "enhanced",
  "deluxe",
  "topline",
  "powertrain",
  "home",
  "auto",
  "electronics",
  "roadside",
  "critical",
  "administrator",
  "everything",
  "breaks",
]);

const BOILERPLATE_PATTERNS = [
  /authorization must be obtained/i,
  /department of insurance/i,
  /obligor in /i,
  /insurance company in /i,
  /purchaser information/i,
  /member #/i,
  /effective date/i,
];

interface ScoredChunk {
  docName: string;
  docType: string;
  text: string;
  score: number;
}

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
    const preview = rows.slice(0, 100).map((row, i) => {
      const fields = headers.map((h) => `${h}: ${row[h] ?? ""}`).join(" | ");
      return `Row ${i + 1}: ${fields}`;
    });

    const suffix =
      rows.length > 100 ? `\n\n... ${rows.length - 100} additional rows omitted ...` : "";

    return `CSV columns: ${headers.join(", ")}\n\n${preview.join("\n")}${suffix}`;
  }

  if (TEXT_EXTENSIONS.has(ext)) {
    return buffer.toString("utf-8").trim();
  }

  throw new Error(`Unsupported file type: ${ext || "unknown"}`);
}

function chunkText(text: string): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter((p) => p.length > 40);

  if (paragraphs.length === 0) {
    return text.trim() ? [text.trim()] : [];
  }

  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    if (current.length + paragraph.length + 1 > CHUNK_TARGET && current.length > 0) {
      chunks.push(current.trim());
      current = paragraph;
    } else {
      current = current ? `${current}\n${paragraph}` : paragraph;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

interface RetrievalQuery {
  terms: Set<string>;
  phrases: string[];
  planNames: string[];
  isCoverageQuestion: boolean;
}

function extractPhrases(text: string): string[] {
  const lower = text.toLowerCase();
  const phrases: string[] = [];

  const wiringHarness = lower.match(/\bwiring\s+harness\b/g);
  if (wiringHarness) phrases.push("wiring harness");

  for (const match of Array.from(
    lower.matchAll(/\b([a-z][a-z0-9-]{2,})\s+(system|components?|coverage)\b/g)
  )) {
    phrases.push(`${match[1]} ${match[2]}`);
  }

  return Array.from(new Set(phrases));
}

function buildRetrievalQuery(
  conversationMessages: { role: string; content: string }[],
  profileKeywords: string[]
): RetrievalQuery {
  const recent = conversationMessages.slice(-10);
  const blob = recent.map((message) => message.content).join("\n");
  const terms = new Set(profileKeywords);

  for (const message of recent) {
    for (const token of tokenize(message.content)) {
      terms.add(token);
    }
  }

  const lowerBlob = blob.toLowerCase();
  const planNames = PLAN_NAMES.filter((plan) => lowerBlob.includes(plan));

  return {
    terms,
    phrases: extractPhrases(blob),
    planNames,
    isCoverageQuestion: COVERAGE_QUERY_PATTERN.test(blob),
  };
}

function scoreChunk(chunk: string, query: RetrievalQuery, docName: string): number {
  const tokens = tokenize(chunk);
  const docTokens = tokenize(docName.replace(/\.[^.]+$/, ""));
  const lowerChunk = chunk.toLowerCase();
  let score = 0;

  for (const token of tokens) {
    if (query.terms.has(token)) score += 3;
    if (SALES_KEYWORDS.has(token)) score += 1;
    if (docTokens.includes(token)) score += 4;
  }

  for (const phrase of query.phrases) {
    if (lowerChunk.includes(phrase)) score += 25;
  }

  if (query.isCoverageQuestion && COMPONENT_SECTION_PATTERN.test(chunk)) {
    score += 15;
  }

  if (query.planNames.some((plan) => docName.toLowerCase().includes(plan))) {
    score += 8;
  }

  if (BOILERPLATE_PATTERNS.some((pattern) => pattern.test(chunk))) {
    score -= 20;
  }

  // Prefer chunks with numbers (pricing, limits, deductibles)
  if (/\$[\d,]+|\d+%|\d+ months?/i.test(chunk)) {
    score += 2;
  }

  return score;
}

function selectChunks(chunks: ScoredChunk[], maxChars: number): string[] {
  if (chunks.length === 0) return [];

  const sorted = [...chunks].sort((a, b) => b.score - a.score);
  const byDoc = new Map<string, ScoredChunk[]>();

  for (const chunk of sorted) {
    const list = byDoc.get(chunk.docName) ?? [];
    list.push(chunk);
    byDoc.set(chunk.docName, list);
  }

  const selected: ScoredChunk[] = [];
  let totalChars = 0;

  // First pass: top chunk from each document for breadth
  for (const [, docChunks] of Array.from(byDoc.entries())) {
    const best = docChunks[0];
    const header = `--- ${best.docName} (${best.docType}) ---\n`;
    if (totalChars + header.length + best.text.length > maxChars) continue;
    selected.push(best);
    totalChars += header.length + best.text.length + 2;
  }

  // Second pass: fill with highest-scoring remaining chunks
  for (const chunk of sorted) {
    if (selected.includes(chunk)) continue;

    const header = `--- ${chunk.docName} (${chunk.docType}) ---\n`;
    const remaining = maxChars - totalChars - header.length - 2;
    if (remaining <= 200) break;

    const text = chunk.text.slice(0, remaining);
    selected.push({ ...chunk, text });
    totalChars += header.length + text.length + 2;
  }

  // Re-sort selected by doc name for readability
  selected.sort((a, b) => a.docName.localeCompare(b.docName));

  const sections: string[] = [];
  let sectionChars = 0;

  for (const chunk of selected) {
    const header = `--- ${chunk.docName} (${chunk.docType}) ---`;
    const remaining = maxChars - sectionChars - header.length - 2;
    if (remaining <= 0) break;

    const text = chunk.text.slice(0, remaining);
    sections.push(`${header}\n${text}`);
    sectionChars += header.length + text.length + 2;
  }

  return sections;
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
  buffer: Buffer,
  sourceUrl?: string
): Promise<StoredDocument> {
  await ensureDataDir();
  await fs.mkdir(DOCS_DIR, { recursive: true });

  const text = await extractText(buffer, filename);
  if (!text) {
    throw new Error("Could not extract text from this file.");
  }

  return saveTextDocument(filename, text, path.extname(filename).toLowerCase() || ".unknown", sourceUrl);
}

export async function saveTextDocument(
  filename: string,
  text: string,
  type: string,
  sourceUrl?: string
): Promise<StoredDocument> {
  await ensureDataDir();
  await fs.mkdir(DOCS_DIR, { recursive: true });

  const id = uuidv4();
  const storedPath = path.join(DOCS_DIR, `${id}.txt`);
  await fs.writeFile(storedPath, text, "utf-8");

  const doc: StoredDocument = {
    id,
    name: filename,
    type,
    size: Buffer.byteLength(text, "utf-8"),
    uploadedAt: new Date().toISOString(),
    excerpt: text.slice(0, EXCERPT_LENGTH).replace(/\s+/g, " "),
    charCount: text.length,
    ...(sourceUrl ? { sourceUrl } : {}),
  };

  const index = await readIndex();
  index.unshift(doc);
  await writeIndex(index);

  return doc;
}

export async function importWebsite(url: string): Promise<StoredDocument> {
  const result = await fetchWebsiteContent(url);

  const index = await readIndex();
  const existing = index.find(
    (doc) => doc.sourceUrl === result.url || doc.sourceUrl === url.trim()
  );

  if (existing) {
    await deleteDocument(existing.id);
  }

  const filename = `${result.hostname} (website).txt`;
  return saveTextDocument(filename, result.text, ".website", result.url);
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

export async function buildDocumentContext(
  conversationMessages: { role: string; content: string }[] = [],
  profileKeywords: string[] = []
): Promise<string> {
  const docs = await listDocuments();
  if (docs.length === 0) {
    return "";
  }

  const query = buildRetrievalQuery(conversationMessages, profileKeywords);
  const allChunks: ScoredChunk[] = [];
  const seenChunkText = new Set<string>();

  for (const doc of docs) {
    const text = await getDocumentText(doc.id);
    if (!text) continue;

    for (const chunk of chunkText(text)) {
      const fingerprint = chunk.slice(0, 240);
      if (seenChunkText.has(fingerprint)) continue;
      seenChunkText.add(fingerprint);

      allChunks.push({
        docName: doc.name,
        docType: doc.type,
        text: chunk,
        score: scoreChunk(chunk, query, doc.name),
      });
    }
  }

  const sections = selectChunks(allChunks, MAX_CONTEXT_CHARS);
  return sections.join("\n\n");
}
