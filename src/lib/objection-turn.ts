import { countAgentTurns } from "./aioa-utils";
import { matchProspectMessageToObjection, resolveObjectionMeta } from "./objection-library";
import type { ResolvedObjection } from "./objection-library";
import type { AioaEvaluation, ChatMessage, ObjectionExample } from "./types";

/** Clear pushback — not greetings, transfer acks, or small talk. */
const STRONG_OBJECTION_SIGNALS = [
  /too (much|expensive|high|pricey)/i,
  /can't afford/i,
  /cannot afford/i,
  /not worth/i,
  /don't need/i,
  /do not need/i,
  /scam/i,
  /think about it/i,
  /need to think/i,
  /ask my (wife|husband|spouse)/i,
  /talk to my (wife|husband|spouse)/i,
  /not interested/i,
  /no thanks/i,
  /bad experience/i,
  /manufacturer('s)? warranty/i,
  /fix it myself/i,
  /not a good time/i,
  /call me back/i,
  /credit card/i,
  /who gave you/i,
  /take me off/i,
  /don't have time/i,
  /do not have time/i,
  /rip-?off/i,
  /how do i know/i,
  /why would i (need|want|pay)/i,
  /not ready/i,
  /need to (check|talk)/i,
  /already covered/i,
  /i('m| am) good\b/i,
  /leave me alone/i,
];

const AGENT_INTRO_PATTERNS = [
  /^(\[|hi[,!]?|hello|hey|good (morning|afternoon|evening))/i,
  /my name is/i,
  /^this is [A-Z][a-z]+(?:\s|$|[,.!])/i,
  /calling from/i,
  /call(ing)? from/i,
  /thank(s| you) for (taking|your time|staying|holding)/i,
  /how are you/i,
  /how('s| is) your day/i,
  /everything breaks/i,
  /let me introduce/i,
  /reach(ing)? out (about|regarding)/i,
  /got you transfer/i,
  /got transferred/i,
  /speaking with/i,
  /pleasure to meet/i,
  /following up on/i,
];

function isWarmTransferAck(message: string): boolean {
  const trimmed = message.trim();
  if (trimmed.length > 160) return false;

  const lower = trimmed.toLowerCase();
  const hasTransferCue =
    /(they said|transfer|transferred|you're gonna|you are gonna|gonna explain|explain the|tell me about|walk me through|what's this about|what is this about)/i.test(
      lower
    );
  const hasGreetingCue = /^(yeah|yes|yep|hi|hello|hey|ok|okay|sure|alright)/i.test(trimmed);

  if (hasTransferCue && (hasGreetingCue || trimmed.length < 100)) {
    return !STRONG_OBJECTION_SIGNALS.some((pattern) => pattern.test(trimmed));
  }

  return false;
}

function isProspectOpeningMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || isWarmTransferAck(trimmed)) return true;

  if (
    /^(okay|ok|sure|alright|go ahead|i'm listening|mm-?hm|uh-?huh|yep|yeah|hello\??|hi\??|hey\??)[,.!\s]*$/i.test(
      trimmed
    )
  ) {
    return true;
  }

  if (trimmed.length < 40 && !STRONG_OBJECTION_SIGNALS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  return false;
}

export function isMetaUserMessage(content: string): boolean {
  const trimmed = content.trim();
  return trimmed.startsWith("[") && trimmed.includes("]");
}

export function isAgentIntroOrGreeting(response: string): boolean {
  const trimmed = response.trim();
  if (!trimmed || isMetaUserMessage(trimmed)) return true;

  if (AGENT_INTRO_PATTERNS.some((pattern) => pattern.test(trimmed))) {
    return true;
  }

  const wordCount = trimmed.split(/\s+/).length;
  if (
    wordCount <= 35 &&
    /(how are you|thank you for|my name|calling from|pleasure|introduce|everything breaks)/i.test(
      trimmed
    ) &&
    !/(if we|so besides|ready to|get you covered|let's get|card|enroll|isolate|understand though)/i.test(
      trimmed
    )
  ) {
    return true;
  }

  return false;
}

export function isLikelyObjectionMessage(message: string): boolean {
  const trimmed = message.trim();
  if (!trimmed || isMetaUserMessage(trimmed)) return false;
  if (isProspectOpeningMessage(trimmed)) return false;
  return STRONG_OBJECTION_SIGNALS.some((pattern) => pattern.test(trimmed));
}

export function isValidObjectionTurn(
  capture: { prospectMessage: string; agentResponse: string },
  agentTurnCount: number
): boolean {
  if (agentTurnCount < 1) return false;
  if (isProspectOpeningMessage(capture.prospectMessage)) return false;
  if (!isLikelyObjectionMessage(capture.prospectMessage)) return false;
  if (isAgentIntroOrGreeting(capture.agentResponse)) return false;
  return true;
}

export function isValidObjectionExample(example: ObjectionExample): boolean {
  const agentTurnCount = countAgentTurns(example.transcript ?? []);
  const turns = agentTurnCount > 0 ? agentTurnCount : 3;
  return isValidObjectionTurn(
    {
      prospectMessage: example.prospectMessage,
      agentResponse: example.agentResponse,
    },
    turns
  );
}

/** Only attribute an AIOA step when it was actually in play for this objection turn. */
export function isAioaStepRelevant(
  stepKey: "agree" | "isolate" | "overcome" | "askForMoney",
  aioa: AioaEvaluation | undefined,
  overallScore: number
): boolean {
  if (!aioa) return false;

  const step = aioa[stepKey];
  if (step.detected) return step.score < 8;

  // Step missing on a weak overall rebuttal — only flag when the score is clearly bad.
  if (overallScore >= 6) return false;

  return step.score <= 4;
}

export function extractObjectionFromLastTurn(
  conversation: { role: string; content: string }[]
): { objectionText: string; agentResponse: string; prospectMessage: string } | null {
  const agentTurnCount = countAgentTurns(conversation as ChatMessage[]);

  const lastUserIndex = [...conversation].reverse().findIndex((message) => message.role === "user");
  if (lastUserIndex === -1) return null;

  const userIndex = conversation.length - 1 - lastUserIndex;
  const agentResponse = conversation[userIndex]?.content ?? "";
  if (!agentResponse.trim() || isMetaUserMessage(agentResponse)) return null;

  let prospectMessage = "";
  for (let index = userIndex - 1; index >= 0; index -= 1) {
    if (conversation[index].role === "assistant") {
      prospectMessage = conversation[index].content;
      break;
    }
  }

  if (!prospectMessage.trim() || isMetaUserMessage(prospectMessage)) return null;

  const capture = {
    objectionText: prospectMessage.trim(),
    agentResponse,
    prospectMessage,
  };

  if (!isValidObjectionTurn(capture, agentTurnCount)) return null;

  return capture;
}

export function resolveCapturedObjection(
  capture: { objectionText: string; prospectMessage: string },
  pool: ResolvedObjection[]
): ResolvedObjection {
  const matched = matchProspectMessageToObjection(capture.prospectMessage, pool);
  if (matched) return matched;
  return resolveObjectionMeta(capture.objectionText, "library");
}
