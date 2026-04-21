import { useEffect, useMemo, useState } from "react";

import { api } from "@/lib/api";
import { STORAGE_KEYS } from "@/lib/constants";

export const UI_COPY_EN = {
  appBadge: "AI Tutor",
  backendOnline: "Online",
  backendOffline: "Offline",
  backendChecking: "Checking",
  heroTitle: "A quieter way to learn",
  heroSubtitle: "One next action, less clutter, clearer progress.",
  featureLessons: "Slide-based lessons",
  featureVoice: "Text and voice answers",
  featureLanguages: "UI and lessons in your language",
  recheck: "Refresh",
  openKeyVault: "Open Key Vault",
  signUp: "Sign up",
  login: "Login",
  createProfile: "Create your learner profile",
  welcomeBack: "Welcome back",
  authSubtitle: "Start learning with a simple, focused setup.",
  fullName: "Full name",
  age: "Age",
  email: "Email address",
  password: "Password",
  interests: "Interests",
  interestsPlaceholder: "What does the learner enjoy?",
  startLearning: "Start learning",
  creatingAccount: "Creating account...",
  continue: "Continue",
  signingIn: "Signing in...",
  dashboard: "Dashboard",
  learningStudio: "Learning Studio",
  keyVault: "Key Vault",
  dark: "Dark",
  light: "Light",
  logout: "Logout",
  continueLearning: "Continue Learning",
  startNewTopic: "Start New Topic",
  yourProgress: "Your Progress",
  completed: "Completed",
  xp: "XP",
  language: "Language",
  actions: "Actions",
  focus: "Focus",
  weakAreas: "Weak Areas",
  completedModules: "Completed Modules",
  show: "Show",
  hide: "Hide",
  noWeakAreas: "No weak areas yet.",
  noCompletedModules: "No modules completed yet.",
  currentPath: "Current Path",
  currentModule: "Current Module",
  completedHistory: "Completed Modules",
  currentPathSubtitle: "Only the current lesson stays open. Finished lessons move into history.",
  noActivePath: "Generate a topic to begin the guided lesson flow.",
  currentLesson: "Current Lesson",
  upcomingLesson: "Up Next",
  completedLabel: "Completed",
  lockedLabel: "Locked",
  openCurrentLesson: "Open current lesson",
  revisitLesson: "Review lesson",
  lessonMeta: "{slides} slides • {questions} quiz questions",
  moduleProgress: "Module Progress",
  moduleProgressDetail: "{completed} of {total} steps completed",
  slideProgress: "Slides: {current}/{total}",
  quizProgress: "Quiz: {current}/{total}",
  startTopic: "Start a new topic",
  startTopicSubtitle: "One topic, one style, one language.",
  enterTopic: "Enter a topic",
  shortPathHint: "The tutor will create a short path instead of showing everything at once.",
  generateTopicPath: "Generate Topic Path",
  generating: "Generating...",
  lessonFlow: "Chat-first tutor flow",
  lessonFlowSubtitle: "Topic, lesson, quiz, then next step.",
  stepTopic: "1. Topic",
  stepLearn: "2. Learn",
  stepQuiz: "3. Quiz",
  stepResult: "4. Next step",
  goToQuiz: "Go to quiz",
  readyForCheckpoint: "Ready for the checkpoint?",
  readyForCheckpointSubtitle: "Finish the lesson, then move to one question.",
  checkpointQuiz: "Checkpoint Quiz",
  checkpointQuizSubtitle: "One question at a time, then the tutor decides whether to move ahead or reteach.",
  questionProgress: "Question {current} of {total}",
  question: "Question",
  backToLesson: "Back to lesson",
  checkAnswer: "Check answer",
  evaluating: "Evaluating...",
  answerPlaceholder: "Type your answer here or use the mic.",
  nextQuestion: "Next Question",
  nextModule: "Next Module",
  startAnotherTopic: "Start Another Topic",
  reviewLessonAgain: "Review Lesson Again",
  result: "Result",
  confidence: "Confidence",
  tutorReply: "Tutor Reply",
  reviewNeeded: "Review needed",
  correct: "Correct",
  resultGoodTitle: "Nice work",
  resultRetryTitle: "Let's tighten this up",
  resultGoodSubtitle: "You completed this module. Continue to the next one.",
  resultCheckpointSubtitle: "You cleared this checkpoint. Move to the next question.",
  resultRetrySubtitle: "The tutor found a weak area. Review the quick reteach, then try again.",
  askCoach: "Ask Coach",
  askCoachPlaceholder: "Ask for a simpler explanation or example.",
  ask: "Ask",
  asking: "Asking...",
  previous: "Previous",
  next: "Next",
  narrate: "Narrate",
  slide: "Slide",
  of: "of",
  keyVaultTitle: "Key Vault",
  keyVaultSubtitle: "Paste one Gemini key and use it across the tutor.",
  geminiApiKey: "Gemini API Key",
  saveKeys: "Save keys",
  clear: "Clear",
  keyVaultHint: "Gemini is enough for modules, explanations, and evaluations.",
  cardOneTitle: "One topic at a time",
  cardOneBody: "Start with a single topic instead of loading the whole learning path at once.",
  cardTwoTitle: "Chat-first guidance",
  cardTwoBody: "Ask Coach behaves more like a chat helper now, with focused responses on the current slide.",
  cardThreeTitle: "Step-by-step progression",
  cardThreeBody: "Topic, explanation, quiz, and next module are now separated into clear steps.",
  confidenceAttempts: "{score}% confidence • {attempts} attempts",
  startLearningPrompt: "Pick a topic and begin your next lesson path.",
  finishedCount: "{count} finished",
  speakerNotes: "Speaker Notes",
  showNotes: "Show notes",
  hideNotes: "Hide notes",
  sourceAi: "AI-generated",
  sourceFallback: "Demo content — add a Gemini key in Key Vault for AI content",
  reteachTitle: "Let's review this concept",
  reteachSubtitle: "Study the reteach summary, then go back to the slides and try the question again.",
  backToSlides: "Back to Slides",
  tryAgain: "Try Again",
  weakConceptsTitle: "Concepts to Review",
  moduleComplete: "Module Complete",
  allModulesComplete: "All modules complete!",
  allModulesCompleteSubtitle: "You've finished every module. Start a new topic or review your dashboard.",
  apiKeyBarTitle: "Gemini API Key Missing",
  apiKeyBarSubtitle: "Add your key to enable the AI coach and module generation.",
  save: "Save",
  yourTopics: "Your Topics",
  switchTopic: "Switch Topic",
  newTopic: "New Topic",
  recentTopics: "Recent Topics"
} as const;

type UiCopyKey = keyof typeof UI_COPY_EN;
type UiCopyMap = Record<UiCopyKey, string>;

const memoryCache = new Map<string, UiCopyMap>();

function cacheKey(language: string) {
  return `ui-copy-${language.toLowerCase()}`;
}

export function useUiCopy(language: string) {
  const normalizedLanguage = language || "English";
  const [translations, setTranslations] = useState<UiCopyMap>(UI_COPY_EN);

  useEffect(() => {
    let cancelled = false;

    if (normalizedLanguage.toLowerCase() === "english") {
      setTranslations(UI_COPY_EN);
      return;
    }

    const mem = memoryCache.get(cacheKey(normalizedLanguage));
    if (mem) {
      setTranslations(mem);
      return;
    }

    const storage = typeof window !== "undefined" ? window.localStorage.getItem(cacheKey(normalizedLanguage)) : null;
    if (storage) {
      try {
        const parsed = JSON.parse(storage) as UiCopyMap;
        memoryCache.set(cacheKey(normalizedLanguage), parsed);
        setTranslations(parsed);
        return;
      } catch {
        // Ignore broken cache and refetch.
      }
    }

    void (async () => {
      try {
        const result = await api.translateUi(normalizedLanguage, UI_COPY_EN);
        const next = { ...UI_COPY_EN, ...result.translations } as UiCopyMap;
        if (!cancelled) {
          setTranslations(next);
        }
        memoryCache.set(cacheKey(normalizedLanguage), next);
        window.localStorage.setItem(cacheKey(normalizedLanguage), JSON.stringify(next));
      } catch {
        if (!cancelled) {
          setTranslations(UI_COPY_EN);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [normalizedLanguage]);

  const t = useMemo(
    () => (key: UiCopyKey, vars?: Record<string, string | number>) => {
      const base = translations[key] ?? UI_COPY_EN[key];
      if (!vars) {
        return base;
      }
      return Object.entries(vars).reduce(
        (value, [varKey, varValue]) => value.replaceAll(`{${varKey}}`, String(varValue)),
        base
      );
    },
    [translations]
  );

  return { t, copy: translations };
}

export function readSavedLanguage() {
  if (typeof window === "undefined") {
    return "English";
  }
  const explicitLanguage = window.localStorage.getItem(STORAGE_KEYS.language);
  if (explicitLanguage) {
    return explicitLanguage;
  }
  const raw = window.localStorage.getItem(STORAGE_KEYS.user);
  if (!raw) {
    return "English";
  }
  try {
    const parsed = JSON.parse(raw) as { language?: string };
    return parsed.language || "English";
  } catch {
    return "English";
  }
}
