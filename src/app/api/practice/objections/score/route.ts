import { requireUser } from "@/lib/auth";
import { extractActiveObjectionResponse } from "@/lib/agent-stats";
import { deriveCallOutcome, countAgentTurns } from "@/lib/aioa-utils";
import {
  deriveReviewStatusFromEvaluation,
  evaluateObjectionExample,
  formatEvaluationFeedback,
} from "@/lib/objection-example-eval";
import {
  countExamplesByStatus,
  getGoodExamplesForObjection,
  isGradingEnabledForObjection,
  listAllExamples,
  saveObjectionExample,
} from "@/lib/objection-examples";
import { buildObjectionPool } from "@/lib/objection-library";
import { parseObjections } from "@/lib/objections";
import { extractObjectionFromLastTurn, isValidObjectionTurn, resolveCapturedObjection } from "@/lib/objection-turn";
import { normalizeObjectionKey } from "@/lib/objection-utils";
import { getProfile } from "@/lib/profile";
import { scoreObjectionTurn } from "@/lib/objection-score";
import { getUserObjections } from "@/lib/user-objections";
import type {
  ChatMessage,
  ObjectionExample,
  ObjectionExampleEvaluation,
  ObjectionGradingStatus,
  ObjectionTrackerItem,
} from "@/lib/types";
import { MIN_GOOD_EXAMPLES_FOR_GRADING } from "@/lib/types";

export const runtime = "nodejs";

function buildScoredItem(
  resolved: ReturnType<typeof resolveCapturedObjection>,
  evaluation: ObjectionExampleEvaluation,
  callOutcome: ReturnType<typeof deriveCallOutcome>
): ObjectionTrackerItem {
  return {
    id: resolved.id,
    text: resolved.text,
    category: resolved.category,
    libraryId: resolved.source === "library" ? resolved.id : undefined,
    source: resolved.source,
    score: evaluation.overallScore,
    feedback: formatEvaluationFeedback(evaluation),
    status:
      callOutcome === "win" || (evaluation.isGoodExample && evaluation.overallScore >= 7)
        ? "scored"
        : evaluation.overallScore < 7
          ? "weak"
          : "scored",
  };
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json();
    const messages = body.messages as ChatMessage[];
    const objections = (body.objections as ObjectionTrackerItem[]) ?? [];

    if (!Array.isArray(messages) || messages.length < 2) {
      return Response.json({ error: "Not enough conversation to score." }, { status: 400 });
    }

    const examples = await listAllExamples();
    let exampleSaved = false;
    let exampleEvaluation: ObjectionExampleEvaluation | null = null;

    let capture =
      objections.length > 0 ? extractActiveObjectionResponse(messages, objections) : null;

    if (!capture) {
      capture = extractObjectionFromLastTurn(messages);
    }

    if (!capture) {
      return Response.json({
        results: [],
        exampleSaved: false,
        exampleEvaluation: null,
        callOutcome: "continue",
        gradingStatuses: [],
        gradingEnabled: false,
        skipped: true,
      });
    }

    const agentTurnCount = countAgentTurns(messages);
    if (!isValidObjectionTurn(capture, agentTurnCount)) {
      return Response.json({
        results: [],
        exampleSaved: false,
        exampleEvaluation: null,
        callOutcome: "continue",
        gradingStatuses: [],
        gradingEnabled: false,
        skipped: true,
      });
    }

    const profile = await getProfile();
    const userObjections = await getUserObjections(user.id);
    const pool = buildObjectionPool(parseObjections(profile.commonObjections), userObjections);
    const resolved = resolveCapturedObjection(capture, pool);
    const objectionText = resolved.text;

    exampleEvaluation = await evaluateObjectionExample({
      objectionText,
      prospectMessage: capture.prospectMessage,
      agentResponse: capture.agentResponse,
      profile,
    });

    const autoStatus = deriveReviewStatusFromEvaluation(exampleEvaluation);

    await saveObjectionExample({
      objectionText,
      userId: user.id,
      userName: user.name,
      agentResponse: capture.agentResponse,
      prospectMessage: capture.prospectMessage,
      transcript: messages.slice(-8),
      aiEvaluation: exampleEvaluation,
      reviewStatus: autoStatus,
      autoReviewed: true,
    });
    exampleSaved = true;

    const callOutcome = deriveCallOutcome(exampleEvaluation, {
      agentTurnCount,
      hasObjectionContext: true,
    });

    const scoredObjection = buildScoredItem(resolved, exampleEvaluation, callOutcome);
    const ephemeralObjections = [scoredObjection];

    const refreshedExamples = await listAllExamples();

    const gradingStatuses: ObjectionGradingStatus[] = ephemeralObjections.map((item) => {
      const key = normalizeObjectionKey(item.text);
      const counts = countExamplesByStatus(refreshedExamples, key);
      return {
        objectionKey: key,
        objectionText: item.text,
        goodExamples: counts.good,
        pendingExamples: counts.pending,
        requiredExamples: MIN_GOOD_EXAMPLES_FOR_GRADING,
        gradingEnabled: isGradingEnabledForObjection(refreshedExamples, item.text),
      };
    });

    const gradableObjections = ephemeralObjections.filter((item) =>
      isGradingEnabledForObjection(refreshedExamples, item.text)
    );

    let results: Awaited<ReturnType<typeof scoreObjectionTurn>> = [];

    if (gradableObjections.length > 0) {
      const goodExamplesByObjection: Record<string, ObjectionExample[]> = {};
      for (const item of gradableObjections) {
        goodExamplesByObjection[item.id] = await getGoodExamplesForObjection(item.text);
      }

      results = await scoreObjectionTurn(messages, gradableObjections, goodExamplesByObjection);
    }

    return Response.json({
      results,
      exampleSaved,
      exampleEvaluation,
      callOutcome,
      gradingStatuses,
      gradingEnabled: gradableObjections.length > 0,
      scoredObjection,
      skipped: false,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Objection scoring failed.";
    const status = message === "Unauthorized" ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
