export function normalizeObjectionKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}
