import fs from "fs/promises";
import path from "path";
import { ensureDataDir } from "./profile";
import { normalizeObjectionKey } from "./objection-utils";

const DIR = path.join(process.cwd(), "data", "user-objections");

function userPath(userId: string): string {
  return path.join(DIR, `${userId}.json`);
}

interface UserObjectionsFile {
  objections: string[];
}

async function readUserObjections(userId: string): Promise<string[]> {
  try {
    const raw = await fs.readFile(userPath(userId), "utf-8");
    const data = JSON.parse(raw) as UserObjectionsFile;
    return Array.isArray(data.objections) ? data.objections : [];
  } catch {
    return [];
  }
}

async function writeUserObjections(userId: string, objections: string[]): Promise<void> {
  await ensureDataDir();
  await fs.mkdir(DIR, { recursive: true });
  await fs.writeFile(userPath(userId), JSON.stringify({ objections }, null, 2), "utf-8");
}

export async function getUserObjections(userId: string): Promise<string[]> {
  return readUserObjections(userId);
}

export async function addUserObjection(userId: string, text: string): Promise<string[]> {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error("Objection text is required.");
  }

  const existing = await readUserObjections(userId);
  const key = normalizeObjectionKey(trimmed);
  if (existing.some((item) => normalizeObjectionKey(item) === key)) {
    throw new Error("This objection is already on your list.");
  }

  const updated = [...existing, trimmed];
  await writeUserObjections(userId, updated);
  return updated;
}

export async function removeUserObjection(userId: string, text: string): Promise<string[]> {
  const key = normalizeObjectionKey(text);
  const updated = (await readUserObjections(userId)).filter(
    (item) => normalizeObjectionKey(item) !== key
  );
  await writeUserObjections(userId, updated);
  return updated;
}
