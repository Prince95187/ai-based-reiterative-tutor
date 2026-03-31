export const STORAGE_KEYS = {
  token: "ai-tutor-token",
  user: "ai-tutor-user",
  theme: "ai-tutor-theme",
  providerKeys: "ai-tutor-provider-keys",
  language: "ai-tutor-language"
} as const;

export const SUPPORTED_LANGUAGES = [
  "Hindi",
  "Konkani",
  "Kannada",
  "Dogri",
  "Bodo",
  "Urdu",
  "Tamil",
  "Kashmiri",
  "Assamese",
  "Bengali",
  "Marathi",
  "Sindhi",
  "Maithili",
  "Punjabi",
  "Malayalam",
  "Manipuri",
  "Telugu",
  "Sanskrit",
  "Nepali",
  "Santali",
  "Gujarati",
  "Odia"
] as const;

export const LEARNING_STYLES = [
  "Normal",
  "Storytelling",
  "Creative",
  "Explain like a 5-year-old"
] as const;
