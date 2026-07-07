import fs from "fs/promises";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { deriveReviewStatusFromEvaluation } from "./objection-example-eval-utils";
import { ensureDataDir } from "./profile";
import { normalizeObjectionKey } from "./objection-utils";
import type { ChatMessage, ObjectionExample, ObjectionExampleEvaluation, ObjectionExampleReviewStatus } from "./types";
import { MIN_GOOD_EXAMPLES_FOR_GRADING } from "./types";

const EXAMPLES_DIR = path.join(process.cwd(), "data", "objection-examples");

function examplePath(id: string): string {
  return path.join(EXAMPLES_DIR, `${id}.json`);
}

/** AI is the sole judge — re-derive from evaluation when available. */
export function getEffectiveReviewStatus(
  example: ObjectionExample
): ObjectionExampleReviewStatus {
  if (example.aiEvaluation) {
    return deriveReviewStatusFromEvaluation(example.aiEvaluation);
  }
  return example.reviewStatus === "good" ? "good" : "rejected";
}

export function exampleOverallScore(example: ObjectionExample): number {
  return example.aiEvaluation?.overallScore ?? 0;
}

export async function saveObjectionExample(input: {
  objectionText: string;
  userId: string;
  userName: string;
  agentResponse: string;
  prospectMessage: string;
  transcript: ChatMessage[];
  aiEvaluation?: ObjectionExampleEvaluation;
  reviewStatus?: ObjectionExampleReviewStatus;
  autoReviewed?: boolean;
}): Promise<ObjectionExample> {
  await ensureDataDir();
  await fs.mkdir(EXAMPLES_DIR, { recursive: true });

  const example: ObjectionExample = {
    id: uuidv4(),
    objectionKey: normalizeObjectionKey(input.objectionText),
    objectionText: input.objectionText.trim(),
    userId: input.userId,
    userName: input.userName,
    agentResponse: input.agentResponse.trim(),
    prospectMessage: input.prospectMessage.trim(),
    transcript: input.transcript,
    createdAt: new Date().toISOString(),
    reviewStatus: input.reviewStatus ?? "pending",
    aiEvaluation: input.aiEvaluation,
    autoReviewed: input.autoReviewed,
    reviewedAt: input.autoReviewed ? new Date().toISOString() : undefined,
    reviewedBy: input.autoReviewed ? "ai" : undefined,
  };

  await fs.writeFile(examplePath(example.id), JSON.stringify(example, null, 2), "utf-8");
  return example;
}

export async function listAllExamples(): Promise<ObjectionExample[]> {
  await ensureDataDir();
  try {
    const files = await fs.readdir(EXAMPLES_DIR);
    const examples: ObjectionExample[] = [];

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      try {
        const raw = await fs.readFile(path.join(EXAMPLES_DIR, file), "utf-8");
        examples.push(JSON.parse(raw) as ObjectionExample);
      } catch {
        // skip corrupt files
      }
    }

    return examples.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch {
    return [];
  }
}

export async function getExampleById(id: string): Promise<ObjectionExample | null> {
  try {
    const raw = await fs.readFile(examplePath(id), "utf-8");
    return JSON.parse(raw) as ObjectionExample;
  } catch {
    return null;
  }
}

export async function updateExampleReview(
  id: string,
  input: {
    reviewStatus: ObjectionExampleReviewStatus;
    reviewedBy: string;
    adminNotes?: string;
  }
): Promise<ObjectionExample | null> {
  const example = await getExampleById(id);
  if (!example) return null;

  const updated: ObjectionExample = {
    ...example,
    reviewStatus: input.reviewStatus,
    reviewedAt: new Date().toISOString(),
    reviewedBy: input.reviewedBy,
    adminNotes: input.adminNotes?.trim() || example.adminNotes,
  };

  await fs.writeFile(examplePath(id), JSON.stringify(updated, null, 2), "utf-8");
  return updated;
}

export function countExamplesByStatus(
  examples: ObjectionExample[],
  objectionKey: string
): { good: number; pending: number; rejected: number; total: number } {
  const filtered = examples.filter((item) => item.objectionKey === objectionKey);
  let good = 0;
  let rejected = 0;

  for (const item of filtered) {
    const status = getEffectiveReviewStatus(item);
    if (status === "good") good += 1;
    else rejected += 1;
  }

  return {
    good,
    pending: 0,
    rejected,
    total: filtered.length,
  };
}

export function isGradingEnabledForObjection(
  _examples: ObjectionExample[],
  _objectionText: string
): boolean {
  return true;
}

export async function getGoodExamplesForObjection(
  objectionText: string,
  limit = 10
): Promise<ObjectionExample[]> {
  const key = normalizeObjectionKey(objectionText);
  const all = await listAllExamples();
  return all
    .filter((item) => item.objectionKey === key && getEffectiveReviewStatus(item) === "good")
    .sort((a, b) => exampleOverallScore(b) - exampleOverallScore(a))
    .slice(0, limit);
}

export function getObjectionSummary(examples: ObjectionExample[]): Array<{
  objectionKey: string;
  objectionText: string;
  good: number;
  pending: number;
  rejected: number;
  gradingEnabled: boolean;
}> {
  const map = new Map<
    string,
    { objectionText: string; good: number; rejected: number }
  >();

  for (const example of examples) {
    const entry = map.get(example.objectionKey) ?? {
      objectionText: example.objectionText,
      good: 0,
      rejected: 0,
    };
    if (getEffectiveReviewStatus(example) === "good") entry.good += 1;
    else entry.rejected += 1;
    map.set(example.objectionKey, entry);
  }

  return Array.from(map.entries())
    .map(([objectionKey, entry]) => ({
      objectionKey,
      objectionText: entry.objectionText,
      good: entry.good,
      pending: 0,
      rejected: entry.rejected,
      gradingEnabled: entry.good >= MIN_GOOD_EXAMPLES_FOR_GRADING,
    }))
    .sort((a, b) => a.good - b.good);
}
