import type { ChatMessage } from "./types";

/** gpt-4o family context window */
export const MODEL_CONTEXT_TOKENS = 128_000;

/** Leave room for the model reply */
const RESERVED_OUTPUT_TOKENS = 4_096;

/** Safety margin for token estimation error */
const SAFETY_MARGIN_TOKENS = 2_000;

/** Cap any single message so one paste cannot blow the budget */
const MAX_MESSAGE_CHARS = 6_000;

/** Hard ceiling for the system prompt (chars) — safety net after per-section caps */
const MAX_SYSTEM_PROMPT_CHARS = 48_000;

export function estimateTokens(text: string): number {
  // Conservative: English + markup often tokenizes closer to 3 chars/token.
  return Math.ceil(text.length / 3);
}

export function trimSystemPrompt(systemPrompt: string): string {
  if (systemPrompt.length <= MAX_SYSTEM_PROMPT_CHARS) {
    return systemPrompt;
  }

  const trimmed = systemPrompt.slice(0, MAX_SYSTEM_PROMPT_CHARS - 120);
  return `${trimmed}\n\n[System context trimmed — reference documents and admin knowledge may be incomplete in this turn.]`;
}

function truncateMessage(message: ChatMessage, maxChars: number): ChatMessage {
  if (message.content.length <= maxChars) {
    return message;
  }

  const trimmed = message.content.slice(-maxChars);
  return {
    ...message,
    content: `[Earlier content trimmed for length]\n\n${trimmed}`,
  };
}

/**
 * Fit conversation history under the model limit after accounting for the system prompt.
 * Keeps the most recent turns; drops older messages first.
 */
export function trimMessagesForContext(
  systemPrompt: string,
  messages: ChatMessage[]
): ChatMessage[] {
  const normalized = messages.map((message) => truncateMessage(message, MAX_MESSAGE_CHARS));

  const maxInputTokens =
    MODEL_CONTEXT_TOKENS - RESERVED_OUTPUT_TOKENS - SAFETY_MARGIN_TOKENS;
  let budget = maxInputTokens - estimateTokens(systemPrompt);

  if (budget <= 0) {
    const last = normalized.at(-1);
    return last ? [truncateMessage(last, Math.max(500, budget * 4))] : [];
  }

  const kept: ChatMessage[] = [];

  for (let index = normalized.length - 1; index >= 0; index -= 1) {
    const message = normalized[index];
    const messageTokens = estimateTokens(message.content);

    if (messageTokens <= budget) {
      kept.unshift(message);
      budget -= messageTokens;
      continue;
    }

    if (kept.length === 0 && budget > 100) {
      kept.unshift(truncateMessage(message, budget * 4));
    }
    break;
  }

  return kept;
}

export function estimateTotalTokens(systemPrompt: string, messages: ChatMessage[]): number {
  return (
    estimateTokens(systemPrompt) +
    messages.reduce((sum, message) => sum + estimateTokens(message.content), 0)
  );
}

export function isWithinContextBudget(systemPrompt: string, messages: ChatMessage[]): boolean {
  return (
    estimateTotalTokens(systemPrompt, messages) <=
    MODEL_CONTEXT_TOKENS - RESERVED_OUTPUT_TOKENS
  );
}

/** Fit system prompt + history under the model limit before calling OpenAI. */
export function prepareChatPayload(
  systemPrompt: string,
  messages: ChatMessage[]
): { systemPrompt: string; messages: ChatMessage[] } {
  const trimmedSystem = trimSystemPrompt(systemPrompt);
  const trimmedMessages = trimMessagesForContext(trimmedSystem, messages);
  return { systemPrompt: trimmedSystem, messages: trimmedMessages };
}
