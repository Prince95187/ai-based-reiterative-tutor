import { LEARNING_STYLES } from "@/lib/constants";

export type LearningStyle = (typeof LEARNING_STYLES)[number];

export type AppUser = {
  id: number;
  name: string;
  email: string;
  age: number;
  language: string;
  interests: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: string;
  user: AppUser;
};

export type Slide = {
  title: string;
  body: string[];
  speaker_note: string;
};

export type Question = {
  prompt: string;
  expected_answer: string;
  concept: string;
  difficulty: string;
};

export type LearningModule = {
  id?: number;
  title: string;
  topic: string;
  language: string;
  learning_style: LearningStyle;
  module_index: number;
  slides: Slide[];
  narration_text: string;
  questions: Question[];
  xp_reward: number;
};

export type GenerateModulesResponse = {
  topic: string;
  language: string;
  learning_style: LearningStyle;
  modules: LearningModule[];
  generation_source?: string;
};

export type EvaluationResponse = {
  correct: boolean;
  confidence: number;
  explanation: string;
  next_action: string;
  reteach_text: string;
  recommended_difficulty: string;
  xp_awarded: number;
};

export type AskCoachResponse = {
  answer: string;
};

export type ProgressRow = {
  module_id: number;
  title: string;
  topic: string;
  status: string;
  score: number;
  attempts: number;
  xp_earned: number;
  weak_concepts: string[];
};

export type DashboardSummary = {
  learner_name: string;
  preferred_language: string;
  completed_modules: number;
  total_modules: number;
  overall_progress: number;
  total_xp: number;
  weak_areas: string[];
  modules: ProgressRow[];
};

export type ProviderKeys = {
  geminiApiKey: string;
};
