export type UserRole = "admin" | "agent";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
}

export interface PracticeSession {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
  mode: ChatMode;
  voiceMode: boolean;
  objectionDrill: boolean;
  messages: ChatMessage[];
  debrief?: PracticeDebrief | null;
  objectionScores: ObjectionTrackerItem[];
}

export interface PracticeSessionSummary {
  id: string;
  userId: string;
  userName: string;
  createdAt: string;
  mode: ChatMode;
  voiceMode: boolean;
  objectionDrill: boolean;
  messageCount: number;
  userTurns: number;
  overallScore?: number;
  objectionCount: number;
  weakObjections: number;
}

export type ChatMode = "practice" | "coach" | "knowledge";

export interface BusinessProfile {
  businessName: string;
  productOrService: string;
  targetCustomer: string;
  valueProposition: string;
  commonObjections: string;
  salesStage: string;
  tone: string;
  productsAndPricing: string;
  talkingPoints: string;
  competitorContext: string;
  practiceScenario: string;
  /** Same-day close and other mandatory sales standards — visible to agents, editable by admin */
  salesPolicy: string;
  /** Admin-only niche context — included in AI prompts, hidden from agent API responses */
  adminKnowledgeEntries: AdminKnowledgeEntry[];
}

export interface AdminKnowledgeEntry {
  id: string;
  title: string;
  body: string;
  createdAt: string;
}

export interface StoredDocument {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
  excerpt: string;
  charCount: number;
  sourceUrl?: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface PracticeDebrief {
  overallScore: number;
  sentiment: {
    label: string;
    summary: string;
  };
  tone: {
    score: number;
    summary: string;
  };
  verbage: {
    score: number;
    summary: string;
    examples: string[];
  };
  objectionHandling: {
    score: number;
    summary: string;
  };
  strengths: string[];
  improvements: string[];
  missedOpportunities: string[];
  nextSteps: string[];
}

export type ObjectionStatus = "pending" | "active" | "scored" | "weak";

export type ObjectionCategory =
  | "price"
  | "need"
  | "trust"
  | "timing"
  | "authority"
  | "resistance"
  | "coverage";

export interface ObjectionTrackerItem {
  id: string;
  text: string;
  score?: number;
  feedback?: string;
  status: ObjectionStatus;
  category?: ObjectionCategory;
  libraryId?: string;
  source?: "library" | "profile" | "personal";
}

export interface ObjectionScoreResult {
  id: string;
  text: string;
  score: number;
  feedback: string;
  addressed: boolean;
  tonalityScore?: number;
  cadenceScore?: number;
  wordChoiceScore?: number;
  wouldWorkOnHuman?: boolean;
}

export interface ObjectionExampleEvaluation {
  overallScore: number;
  isGoodExample: boolean;
  wouldWorkOnHuman: boolean;
  tonality: { score: number; summary: string };
  cadence: { score: number; summary: string };
  wordChoice: { score: number; summary: string; strongPhrases: string[]; weakPhrases: string[] };
  summary: string;
  improvements: string[];
  aioa?: AioaEvaluation;
}

export type AioaCallOutcome = "continue" | "win" | "hangup";

export type PracticeCallOutcome = "active" | "won" | "hung_up";

export interface AioaStepEval {
  score: number;
  detected: boolean;
  summary: string;
}

export interface AioaEvaluation {
  agree: AioaStepEval;
  isolate: AioaStepEval;
  overcome: AioaStepEval;
  askForMoney: AioaStepEval;
  overallScore: number;
  callOutcome: AioaCallOutcome;
  summary: string;
}

export const MIN_GOOD_EXAMPLES_FOR_GRADING = 1;

export type ObjectionExampleReviewStatus = "pending" | "good" | "rejected";

export interface ObjectionExample {
  id: string;
  objectionKey: string;
  objectionText: string;
  userId: string;
  userName: string;
  agentResponse: string;
  prospectMessage: string;
  transcript: ChatMessage[];
  createdAt: string;
  reviewStatus: ObjectionExampleReviewStatus;
  reviewedAt?: string;
  reviewedBy?: string;
  adminNotes?: string;
  aiEvaluation?: ObjectionExampleEvaluation;
  autoReviewed?: boolean;
}

export interface ObjectionGradingStatus {
  objectionKey: string;
  objectionText: string;
  goodExamples: number;
  pendingExamples: number;
  requiredExamples: number;
  gradingEnabled: boolean;
}

export type ImprovementStatus = "critical" | "developing" | "strong";

export type ImprovementExampleKind =
  | "feedback"
  | "your-response"
  | "better-approach"
  | "phrase-to-avoid";

export interface ImprovementExample {
  id: string;
  kind: ImprovementExampleKind;
  title: string;
  body: string;
  context?: string;
  score?: number;
  date?: string;
}

export interface ImprovementArea {
  id: string;
  label: string;
  score: number;
  status: ImprovementStatus;
  summary: string;
  tip: string;
  dataPoints: number;
  examples: ImprovementExample[];
}

export interface AgentStats {
  totalSessions: number;
  sessionsLast7Days: number;
  averageScore: number | null;
  scoreTrend: Array<{ date: string; averageScore: number; sessionCount: number }>;
  objectionProgress: Array<{
    text: string;
    category: ObjectionCategory;
    timesPracticed: number;
    bestScore: number | null;
    averageScore: number | null;
    lastPracticedAt: string | null;
    gradingEnabled: boolean;
    goodExamples: number;
    examplesSubmitted: number;
    latestFeedback?: string;
  }>;
  objectionByCategory: Array<{
    category: ObjectionCategory;
    label: string;
    practiced: number;
    averageScore: number | null;
    weakCount: number;
  }>;
  recentFeedback: Array<{
    date: string;
    overallScore: number;
    strengths: string[];
    improvements: string[];
  }>;
  examplesSubmitted: number;
  examplesApproved: number;
  improvementAreas: ImprovementArea[];
}

export const DEFAULT_PROFILE: BusinessProfile = {
  businessName: "",
  productOrService: "",
  targetCustomer: "",
  valueProposition: "",
  commonObjections: "",
  salesStage: "closing",
  tone: "professional and consultative",
  productsAndPricing: "",
  talkingPoints: "",
  competitorContext: "",
  practiceScenario: "",
  salesPolicy: "",
  adminKnowledgeEntries: [],
};
