import { requireUser } from "@/lib/auth";
import {
  findUserAvatarPath,
  getAllowedAvatarMimeTypes,
  saveUserAvatar,
} from "@/lib/agent-avatars";
import { updateAgentProfile } from "@/lib/agent-progression";
import fs from "fs/promises";

export const runtime = "nodejs";

export async function GET() {
  try {
    const user = await requireUser();
    const filePath = await findUserAvatarPath(user.id);

    if (!filePath) {
      return new Response(null, { status: 404 });
    }

    const buffer = await fs.readFile(filePath);
    const ext = filePath.slice(filePath.lastIndexOf(".")).toLowerCase();
    const contentType =
      ext === ".png" ? "image/png" : ext === ".webp" ? "image/webp" : "image/jpeg";

    return new Response(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load avatar.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const formData = await request.formData();
    const file = formData.get("avatar");

    if (!(file instanceof File)) {
      return Response.json({ error: "Choose an image to upload." }, { status: 400 });
    }

    if (!getAllowedAvatarMimeTypes().includes(file.type)) {
      return Response.json({ error: "Use a JPG, PNG, or WebP image." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await saveUserAvatar(user.id, buffer, file.type);

    const uploadedAt = new Date().toISOString();
    await updateAgentProfile(user.id, {
      profilePicture: { type: "upload", uploadedAt },
    });

    return Response.json({
      profilePicture: { type: "upload", uploadedAt },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to upload avatar.";
    const status =
      message === "Unauthorized" ? 401 : message.includes("2 MB") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
