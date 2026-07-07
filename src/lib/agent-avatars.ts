import fs from "fs/promises";
import path from "path";
import { ensureDataDir } from "./profile";

const AVATARS_DIR = path.join(process.cwd(), "data", "avatars");
const MAX_BYTES = 2 * 1024 * 1024;

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export async function ensureAvatarsDir(): Promise<void> {
  await ensureDataDir();
  await fs.mkdir(AVATARS_DIR, { recursive: true });
}

function avatarPathForUser(userId: string, ext: string): string {
  return path.join(AVATARS_DIR, `${userId}${ext}`);
}

export async function findUserAvatarPath(userId: string): Promise<string | null> {
  await ensureAvatarsDir();
  for (const ext of Object.values(EXT_BY_MIME)) {
    const filePath = avatarPathForUser(userId, ext);
    try {
      await fs.access(filePath);
      return filePath;
    } catch {
      // try next extension
    }
  }
  return null;
}

export async function saveUserAvatar(
  userId: string,
  buffer: Buffer,
  mimeType: string
): Promise<void> {
  if (buffer.length > MAX_BYTES) {
    throw new Error("Image must be 2 MB or smaller.");
  }

  const ext = EXT_BY_MIME[mimeType];
  if (!ext) {
    throw new Error("Use a JPG, PNG, or WebP image.");
  }

  await ensureAvatarsDir();

  for (const otherExt of Object.values(EXT_BY_MIME)) {
    if (otherExt === ext) continue;
    try {
      await fs.unlink(avatarPathForUser(userId, otherExt));
    } catch {
      // no previous file with this extension
    }
  }

  await fs.writeFile(avatarPathForUser(userId, ext), buffer);
}

export async function deleteUserAvatar(userId: string): Promise<void> {
  const existing = await findUserAvatarPath(userId);
  if (!existing) return;
  await fs.unlink(existing);
}

export function getAllowedAvatarMimeTypes(): string[] {
  return Object.keys(EXT_BY_MIME);
}
