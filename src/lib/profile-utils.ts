import type { BusinessProfile } from "./types";
import { formatSalesPolicyBlock, getEffectiveSalesPolicy } from "./sales-policy";
import { formatAdminKnowledgeForPrompt, normalizeAdminKnowledge } from "./admin-knowledge-utils";

export { DEFAULT_SALES_POLICY, formatSalesPolicyBlock, getEffectiveSalesPolicy, SAME_DAY_CLOSE_TAGLINE } from "./sales-policy";

function section(title: string, body: string | undefined): string | null {
  const trimmed = body?.trim();
  if (!trimmed) return null;
  return `### ${title}\n${trimmed}`;
}

export function formatProfileForPrompt(profile: BusinessProfile): string {
  const sections = [
    section("Company", profile.businessName),
    section("What we sell", profile.productOrService),
    section("Products, plans & pricing", profile.productsAndPricing),
    section("Target customer (ICP)", profile.targetCustomer),
    section("Value proposition & differentiators", profile.valueProposition),
    section("Key talking points & scripts", profile.talkingPoints),
    section("vs. competitors / alternatives", profile.competitorContext),
    section("Common objections to use in role-play", profile.commonObjections),
    section("Default sales stage for practice", profile.salesStage),
    section("Sales tone", profile.tone),
    section("Company sales policy (mandatory standard)", getEffectiveSalesPolicy(profile)),
    section("Practice scenario setup", profile.practiceScenario),
    section(
      "Internal company knowledge (admin-provided — treat as factual, use in practice and coaching)",
      formatAdminKnowledgeForPrompt(normalizeAdminKnowledge(profile))
    ),
  ].filter(Boolean);

  if (sections.length === 0) {
    return "No business profile configured. Ask the user for their company, product, and target customer before giving advice.";
  }

  return sections.join("\n\n");
}

export function tokenize(text: string): string[] {
  const matches = text.toLowerCase().match(/\b[a-z0-9]{3,}\b/g) ?? [];
  return Array.from(new Set(matches));
}

export function getProfileKeywords(profile: BusinessProfile): string[] {
  const blob = Object.values(profile).join(" ");
  return tokenize(blob);
}
