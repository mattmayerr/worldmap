import type { BusinessProfile } from "./types";

/** Company default — editable in Business settings. Injected into all practice, coach, and grading prompts. */
export const DEFAULT_SALES_POLICY = `SAME-DAY CLOSE (mandatory company standard):
- Every qualified warm transfer must be closed TODAY on this call — not tomorrow, not "call me back," not "I'll think about it."
- The rep's job is to enroll or set up coverage before hanging up. Scheduling a follow-up call is NOT a successful outcome.
- "I need to think about it," "call me back later," "not a good time," and "let me talk to my spouse first" are delay/smokescreen objections — isolate and overcome them on THIS call.
- Use ethical urgency: they are already on the line, coverage can start today, and waiting leaves them unprotected.
- After AIOA, always Ask for the money with a same-day setup ask (e.g. "Let's get you started today", "I can take your card now and you'll be covered tonight").
- Never coach reps to accept a callback, send info to review later, or end without a clear same-day close attempt.
- Grade reps DOWN if they agree to call back later or fail to ask for enrollment today when the prospect is still on the line.`;

export function getEffectiveSalesPolicy(profile: BusinessProfile): string {
  const custom = profile.salesPolicy?.trim();
  return custom || DEFAULT_SALES_POLICY;
}

export function formatSalesPolicyBlock(profile: BusinessProfile): string {
  return `## Company sales policy (mandatory — all coaching, practice, and grading must align)\n${getEffectiveSalesPolicy(profile)}`;
}

/** Short line for UI starter copy and kickoffs. */
export const SAME_DAY_CLOSE_TAGLINE =
  "Company standard: close on the same call — no callbacks or 'think about it' as the goal.";
