import { requireUser } from "@/lib/auth";
import { getProgressionSummary, prestigeAgent } from "@/lib/agent-progression";
import { getCosmeticDefinition } from "@/lib/cosmetics";

export const runtime = "nodejs";

export async function POST() {
  try {
    const user = await requireUser();
    const result = await prestigeAgent(user.id);
    const progression = await getProgressionSummary(user.id);

    const unlockedDetails = result.unlockedCosmetics
      .map((id) => getCosmeticDefinition(id))
      .filter((item) => item !== undefined);

    return Response.json({
      result,
      progression,
      unlockedDetails,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prestige.";
    const status =
      message === "Unauthorized"
        ? 401
        : message.includes("Reach level") || message.includes("maximum prestige")
          ? 400
          : 500;
    return Response.json({ error: message }, { status });
  }
}
