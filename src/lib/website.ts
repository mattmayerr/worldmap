const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15000;

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

function isPrivateIp(hostname: string): boolean {
  if (/^10\.\d+\.\d+\.\d+$/.test(hostname)) return true;
  if (/^192\.168\.\d+\.\d+$/.test(hostname)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+$/.test(hostname)) return true;
  if (/^169\.254\.\d+\.\d+$/.test(hostname)) return true;
  return false;
}

export function normalizeWebsiteUrl(input: string): URL {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error("Please enter a website URL.");
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;

  try {
    parsed = new URL(withProtocol);
  } catch {
    throw new Error("That doesn't look like a valid URL.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Only http and https URLs are supported.");
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname) || isPrivateIp(hostname)) {
    throw new Error("That URL is not allowed.");
  }

  return parsed;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'");
}

export function htmlToText(html: string): string {
  const withoutNoise = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ");

  const withBreaks = withoutNoise
    .replace(/<\/(p|div|h[1-6]|li|tr|section|article|header|footer|main)>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<h[1-6][^>]*>/gi, "\n\n");

  const stripped = withBreaks.replace(/<[^>]+>/g, " ");
  const decoded = decodeHtmlEntities(stripped);

  return decoded
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (!match) return "";
  return decodeHtmlEntities(match[1].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

export interface WebsiteImportResult {
  url: string;
  hostname: string;
  title: string;
  text: string;
}

export async function fetchWebsiteContent(inputUrl: string): Promise<WebsiteImportResult> {
  const parsed = normalizeWebsiteUrl(inputUrl);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "SalesAgentAssistant/1.0 (website import)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`Could not fetch website (HTTP ${response.status}).`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error("That URL did not return an HTML page.");
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > MAX_RESPONSE_BYTES) {
      throw new Error("Website is too large to import (max 2 MB).");
    }

    const html = buffer.toString("utf-8");
    const title = extractTitle(html);
    const body = htmlToText(html);

    if (body.length < 100) {
      throw new Error("Could not extract enough text from that page.");
    }

    const header = [
      `Source: ${parsed.toString()}`,
      title ? `Title: ${title}` : null,
      `Imported: ${new Date().toISOString()}`,
      "",
    ]
      .filter(Boolean)
      .join("\n");

    return {
      url: parsed.toString(),
      hostname: parsed.hostname,
      title,
      text: `${header}\n${body}`,
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Website request timed out. Try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
