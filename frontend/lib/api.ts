import { STORAGE_KEYS } from "@/lib/constants";
import {
  AskCoachResponse,
  AuthResponse,
  DashboardSummary,
  EvaluationResponse,
  GenerateModulesResponse,
  LearningStyle,
  ProviderKeys,
  Question
} from "@/lib/types";

const API_URL = "/api";

function getProviderHeaders() {
  if (typeof window === "undefined") {
    return {};
  }

  const raw = window.localStorage.getItem(STORAGE_KEYS.providerKeys);
  if (!raw) {
    return {};
  }

  try {
    const keys = JSON.parse(raw) as ProviderKeys;
    return {
      ...(keys.geminiApiKey ? { "x-gemini-api-key": keys.geminiApiKey } : {})
    };
  } catch {
    return {};
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...getProviderHeaders(),
        ...(options.headers ?? {})
      },
      cache: "no-store"
    });
  } catch {
    throw new Error("Could not reach the tutor service. Make sure both the frontend and backend servers are running.");
  }

  if (!response.ok) {
    const fallback = "Something went wrong while talking to the API.";
    try {
      const data = await response.json();
      throw new Error(data.detail ?? fallback);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error(fallback);
    }
  }

  return response.json() as Promise<T>;
}

export const api = {
  health() {
    return request<{ status: string }>("/health");
  },
  signup(payload: {
    name: string;
    email: string;
    password: string;
    age: number;
    language: string;
    interests: string;
  }) {
    return request<AuthResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  login(payload: { email: string; password: string }) {
    return request<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },
  translateUi(language: string, entries: Record<string, string>) {
    return request<{ language: string; translations: Record<string, string> }>("/translate-ui", {
      method: "POST",
      body: JSON.stringify({ language, entries })
    });
  },
  fetchSummary(token: string) {
    return request<DashboardSummary>("/dashboard/summary", {}, token);
  },
  listTopics(token: string) {
    return request<string[]>("/topics", {}, token);
  },
  fetchTopicModules(token: string, topicName: string) {
    return request<GenerateModulesResponse>(`/topic/${encodeURIComponent(topicName)}`, {}, token);
  },
  generateModules(
    token: string,
    payload: { topic: string; language: string; learning_style: LearningStyle }
  ) {
    return request<GenerateModulesResponse>(
      "/generate-modules",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    );
  },
  evaluateAnswer(
    token: string,
    payload: { module_id: number; question: Question; question_index: number; question_count: number; user_answer: string }
  ) {
    return request<EvaluationResponse>(
      "/evaluate-answer",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    );
  },
  askCoach(
    token: string,
    payload: {
      language: string;
      module_title: string;
      slide_title: string;
      slide_body: string[];
      question: string;
    }
  ) {
    return request<AskCoachResponse>(
      "/ask-coach",
      {
        method: "POST",
        body: JSON.stringify(payload)
      },
      token
    );
  },
  async transcribeAudio(token: string, language: string, file: Blob) {
    const formData = new FormData();
    formData.append("file", file, "voice-note.webm");
    formData.append("language", language);

    let response: Response;
    try {
      response = await fetch(`${API_URL}/transcribe-audio?language=${encodeURIComponent(language)}`, {
        method: "POST",
        body: formData,
        headers: {
          Authorization: `Bearer ${token}`,
          ...getProviderHeaders()
        }
      });
    } catch {
      throw new Error("Could not reach the tutor service for voice transcription.");
    }

    if (!response.ok) {
      throw new Error("Audio transcription failed.");
    }

    return response.json() as Promise<{ transcript: string; language: string; provider: string }>;
  }
};
