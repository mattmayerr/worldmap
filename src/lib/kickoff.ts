import type { BusinessProfile } from "./types";
import { SAME_DAY_CLOSE_TAGLINE } from "./sales-policy";

export function buildPracticeKickoff(profile: BusinessProfile): string {
  const company = profile.businessName.trim() || "the company";
  const product = profile.productOrService.trim() || "the warranty";
  const stage = profile.salesStage.trim() || "closing";

  return `[START WARM TRANSFER] I am a sales agent at ${company}. A screener just verified this customer and warm-transferred them to me. They EXPECT this call and agreed to hear about ${product}. We are at the ${stage} stage. ${SAME_DAY_CLOSE_TAGLINE} Play the customer who was just transferred on — acknowledge the handoff ("Yeah hi, they said you're gonna explain the coverage?" or similar). You are willing to listen but still skeptical. Let me introduce myself and pitch before you raise objections. Do NOT hang up immediately. Use varied objections when the time is right — if I handle them well and ask to enroll TODAY, agree to set up coverage on this call.`;
}

export function getPracticeStarter(profile: BusinessProfile): string {
  const name = profile.businessName.trim();
  const stage = profile.salesStage.trim() || "closing";

  if (name) {
    return `Practice a warm transfer call for ${name}. Close on the same call — company standard is same-day enrollment, not callbacks. Introduce yourself, pitch, handle objections with AIOA, and ask for the sale today.`;
  }

  return "Practice a warm lead transfer. Close today on the call — handle objections with AIOA and ask for enrollment before you hang up.";
}

export function getCoachStarter(profile: BusinessProfile): string {
  const name = profile.businessName.trim();

  if (name) {
    return `Ask how to handle a specific objection, close same-day, or scenario for ${name}. You'll get word-for-word scripts grounded in your plans — always toward closing on this call.`;
  }

  return "Describe a deal or objection you're facing. You'll get specific scripts for a same-day close — not generic sales theory or callback advice.";
}

export function getKnowledgeStarter(profile: BusinessProfile): string {
  const name = profile.businessName.trim();

  if (name) {
    return `Ask anything about ${name} — plans, coverage, pricing, policies, or how things work. Answers come from your profile and uploaded documents.`;
  }

  return "Ask questions about your company, products, and policies. Answers are grounded in your profile and uploaded documents.";
}

export const KNOWLEDGE_PROMPTS = [
  "What's covered under the Home plan?",
  "What's the difference between Deluxe and Topline?",
  "How does our claims process work?",
];
