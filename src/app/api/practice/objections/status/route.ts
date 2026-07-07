import { requireUser } from "@/lib/auth";
import { parseObjections } from "@/lib/objections";
import { getProfile } from "@/lib/profile";
import {
  countExamplesByStatus,
  isGradingEnabledForObjection,
  listAllExamples,
} from "@/lib/objection-examples";
import {
  B2C_OBJECTION_LIBRARY,
  DEFAULT_PRACTICE_OBJECTION_COUNT,
  OBJECTION_CATEGORY_LABELS,
  OBJECTION_CATEGORY_ORDER,
  buildObjectionPool,
  groupByCategory,
  pickRandomObjections,
} from "@/lib/objection-library";
import { normalizeObjectionKey } from "@/lib/objection-utils";
import { computeObjectionPerformance } from "@/lib/objection-stats";
import { getUserObjections } from "@/lib/user-objections";
import { listSessionsForUser } from "@/lib/practice-sessions";
import type { ObjectionGradingStatus } from "@/lib/types";
import { MIN_GOOD_EXAMPLES_FOR_GRADING } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const count = Math.min(
      15,
      Math.max(1, Number(searchParams.get("count")) || DEFAULT_PRACTICE_OBJECTION_COUNT)
    );
    const shuffle = searchParams.get("shuffle") !== "0";
    const focusId = searchParams.get("focus");

    const profile = await getProfile();
    const profileObjections = parseObjections(profile.commonObjections);
    const [userObjections, examples, sessions] = await Promise.all([
      getUserObjections(user.id),
      listAllExamples(),
      listSessionsForUser(user.id),
    ]);

    const pool = buildObjectionPool(profileObjections, userObjections);

    let sessionObjections = shuffle ? pickRandomObjections(pool, count) : pool.slice(0, count);
    if (focusId) {
      const focused = pool.find((item) => item.id === focusId);
      if (focused) {
        const rest = pickRandomObjections(
          pool.filter((item) => item.id !== focusId),
          Math.max(0, count - 1)
        );
        sessionObjections = [focused, ...rest];
      }
    }

    const performance = computeObjectionPerformance(sessions, examples, user.id);
    const performanceMap = new Map(performance.map((item) => [item.objectionKey, item]));

    const statuses: ObjectionGradingStatus[] = sessionObjections.map((item) => {
      const key = normalizeObjectionKey(item.text);
      const counts = countExamplesByStatus(examples, key);
      return {
        objectionKey: key,
        objectionText: item.text,
        goodExamples: counts.good,
        pendingExamples: counts.pending,
        requiredExamples: MIN_GOOD_EXAMPLES_FOR_GRADING,
        gradingEnabled: isGradingEnabledForObjection(examples, item.text),
      };
    });

    return Response.json({
      sessionObjections,
      poolSize: pool.length,
      librarySize: B2C_OBJECTION_LIBRARY.length,
      statuses,
      userObjections,
      categories: OBJECTION_CATEGORY_ORDER.map((category) => ({
        id: category,
        label: OBJECTION_CATEGORY_LABELS[category],
        objections: groupByCategory(pool)[category],
      })),
      performance: performance.filter((item) => item.attempts > 0),
      performanceMap: Object.fromEntries(
        sessionObjections.map((item) => {
          const key = normalizeObjectionKey(item.text);
          return [key, performanceMap.get(key) ?? null];
        })
      ),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load objection status.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
