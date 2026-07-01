export type ChatMode = "practice" | "coach";

export interface BusinessProfile {
  businessName: string;
  productOrService: string;
  targetCustomer: string;
  valueProposition: string;
  commonObjections: string;
  salesStage: string;
  tone: string;
}

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  excerpt: string;
  charCount: number;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "",
  productOrService: "",
  targetCustomer: "",
  valueProposition: "",
  commonObjections: "",
  salesStage: "discovery",
  tone: "professional and consultative",
};
