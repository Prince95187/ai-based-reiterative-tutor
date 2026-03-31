"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BrainCircuit, CheckCircle2, Sparkles } from "lucide-react";

import { FloatingVoiceButton } from "@/components/floating-voice-button";
import { SlideViewer } from "@/components/slide-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LEARNING_STYLES, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { EvaluationResponse, GenerateModulesResponse, LearningModule, LearningStyle } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

type StudioStep = "topic" | "learn" | "quiz" | "result";
type CoachMessage = { role: "user" | "coach"; text: string };

export function LearningStudio({
  token,
  preferredLanguage,
  modulesResponse,
  generating,
  evaluating,
  evaluation,
  onGenerateModules,
  onEvaluate,
  onAskCoach
}: {
  token: string;
  preferredLanguage: string;
  modulesResponse: GenerateModulesResponse | null;
  generating: boolean;
  evaluating: boolean;
  evaluation: EvaluationResponse | null;
  onGenerateModules: (payload: { topic: string; language: string; learning_style: LearningStyle }) => Promise<void>;
  onEvaluate: (payload: { module_id: number; questionIndex: number; user_answer: string }) => Promise<void>;
  onAskCoach: (payload: {
    language: string;
    module_title: string;
    slide_title: string;
    slide_body: string[];
    question: string;
  }) => Promise<string>;
}) {
  const [topic, setTopic] = useState("Photosynthesis");
  const [language, setLanguage] = useState(preferredLanguage || "English");
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("Storytelling");
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState<StudioStep>("topic");
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const { t } = useUiCopy(language);

  const modules = modulesResponse?.modules ?? [];
  const activeModule = modules[activeModuleIndex] ?? null;
  const activeQuestion = useMemo(() => (activeModule ? activeModule.questions[0] : null), [activeModule]);

  useEffect(() => {
    setLanguage(preferredLanguage || "English");
  }, [preferredLanguage]);

  useEffect(() => {
    if (!modules.length) {
      setStep("topic");
      return;
    }
    setStep("learn");
  }, [modules.length]);

  useEffect(() => {
    setCoachMessages([]);
    setCoachPrompt("");
    setAnswer("");
    setActiveSlideIndex(0);
  }, [activeModuleIndex]);

  useEffect(() => {
    if (!evaluation || !activeModule) {
      return;
    }

    setStep("result");
    if (evaluation.correct && activeModule.id && !completedModules.includes(activeModule.id)) {
      setCompletedModules((current) => [...current, activeModule.id!]);
    }
  }, [evaluation, activeModule, completedModules]);

  const goToNextModule = () => {
    if (activeModuleIndex < modules.length - 1) {
      setActiveModuleIndex((current) => current + 1);
      setStep("learn");
      return;
    }
    setStep("topic");
  };

  const visiblePreviousModules = modules.filter((module, index) => index < activeModuleIndex);

  return (
    <div className="space-y-6">
      <Card className="hero-panel">
        <CardHeader>
          <CardTitle>{t("lessonFlow")}</CardTitle>
          <CardDescription>
            {t("lessonFlowSubtitle")}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {[
            { id: "topic", label: t("stepTopic") },
            { id: "learn", label: t("stepLearn") },
            { id: "quiz", label: t("stepQuiz") },
            { id: "result", label: t("stepResult") }
          ].map((item) => (
            <Badge
              className={step === item.id ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}
              key={item.id}
            >
              {item.label}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
        <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>{t("currentPath")}</CardTitle>
                <CardDescription>{t("currentPathSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
              {activeModule ? (
                <div className="rounded-[28px] border border-primary/40 bg-primary/10 p-5">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("currentModule")}</p>
                  <p className="mt-2 text-xl font-semibold">{activeModule.title}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activeModule.slides.length} slides • {activeModule.questions.length} quiz • style {activeModule.learning_style}
                  </p>
                </div>
              ) : (
                <div className="rounded-[28px] border border-border/70 bg-card/70 p-5 text-sm text-muted-foreground">
                  {t("noActivePath")}
                </div>
              )}

              {visiblePreviousModules.length ? (
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("completedHistory")}</p>
                  {visiblePreviousModules.map((module) => (
                    <div className="rounded-[24px] border border-border/70 bg-card/70 p-4" key={module.title}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold">{module.title}</p>
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {step === "topic" ? (
            <Card>
              <CardHeader>
                <CardTitle>{t("startTopic")}</CardTitle>
                <CardDescription>{t("startTopicSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <Input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder={t("enterTopic")} />
                <div className="grid gap-4 md:grid-cols-2">
                  <Select value={language} onChange={(event) => setLanguage(event.target.value)}>
                    <option value="English">English</option>
                    {SUPPORTED_LANGUAGES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                  <Select value={learningStyle} onChange={(event) => setLearningStyle(event.target.value as LearningStyle)}>
                    {LEARNING_STYLES.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="rounded-[28px] border border-border/70 bg-card/70 p-5 text-sm text-muted-foreground">
                  {t("shortPathHint")}
                </div>
                <Button
                  disabled={generating || !topic.trim()}
                  onClick={async () => {
                    await onGenerateModules({ topic, language, learning_style: learningStyle });
                    setCompletedModules([]);
                    setActiveModuleIndex(0);
                    setStep("learn");
                  }}
                >
                  {generating ? t("generating") : t("generateTopicPath")}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {step === "learn" && activeModule ? (
            <div className="space-y-6">
              <SlideViewer
                coachMessages={coachMessages}
                coachPrompt={coachPrompt}
                module={activeModule}
                coachLoading={coachLoading}
                onAskCoach={async () => {
                  if (!coachPrompt.trim()) {
                    return;
                  }
                  const prompt = coachPrompt;
                  const slide = activeModule.slides[activeSlideIndex];
                  setCoachMessages((current) => [...current, { role: "user", text: prompt }]);
                  setCoachPrompt("");
                  setCoachLoading(true);
                  try {
                    const reply = await onAskCoach({
                      language,
                      module_title: activeModule.title,
                      slide_title: slide.title,
                      slide_body: slide.body,
                      question: prompt
                    });
                    setCoachMessages((current) => [...current, { role: "coach", text: reply }]);
                  } finally {
                    setCoachLoading(false);
                  }
                }}
                onCoachPromptChange={setCoachPrompt}
                onSlideChange={(nextIndex) => setActiveSlideIndex(nextIndex)}
                slideIndex={activeSlideIndex}
                language={language}
              />

              <Card>
                <CardContent className="flex items-center justify-between p-6">
                  <div>
                    <p className="text-sm font-semibold">{t("readyForCheckpoint")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("readyForCheckpointSubtitle")}
                    </p>
                  </div>
                  <Button onClick={() => setStep("quiz")}>
                    {t("goToQuiz")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          ) : null}

          {step === "quiz" && activeModule && activeQuestion ? (
            <Card className="relative">
              <CardHeader>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <CardTitle>{t("checkpointQuiz")}</CardTitle>
                    <CardDescription>{t("checkpointQuizSubtitle")}</CardDescription>
                  </div>
                  <Badge className="bg-sky-100 text-sky-700">{activeQuestion.difficulty}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-[28px] border border-border/70 bg-card/80 p-5">
                  <p className="text-sm font-semibold">{t("question")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">{activeQuestion.prompt}</p>
                </div>

                <Textarea
                  placeholder={t("answerPlaceholder")}
                  value={answer}
                  onChange={(event) => setAnswer(event.target.value)}
                />

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    disabled={evaluating || !answer.trim() || !activeModule.id}
                    onClick={async () => {
                      if (!activeModule.id) {
                        return;
                      }
                      await onEvaluate({
                        module_id: activeModule.id,
                        questionIndex: 0,
                        user_answer: answer
                      });
                    }}
                    variant="success"
                  >
                    {evaluating ? t("evaluating") : t("checkAnswer")}
                  </Button>
                  <Button onClick={() => setStep("learn")} variant="secondary">
                    {t("backToLesson")}
                  </Button>
                </div>
              </CardContent>

              <FloatingVoiceButton
                language={language}
                onTranscript={(transcript) => setAnswer((current) => `${current} ${transcript}`.trim())}
                token={token}
              />
            </Card>
          ) : null}

          {step === "result" && evaluation && activeModule ? (
            <Card>
              <CardHeader>
                <CardTitle>{evaluation.correct ? t("resultGoodTitle") : t("resultRetryTitle")}</CardTitle>
                <CardDescription>
                  {evaluation.correct
                    ? t("resultGoodSubtitle")
                    : t("resultRetrySubtitle")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-border/70 bg-card/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("result")}</p>
                    <p className="mt-2 text-lg font-semibold">{evaluation.correct ? t("correct") : t("reviewNeeded")}</p>
                  </div>
                  <div className="rounded-[24px] border border-border/70 bg-card/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("confidence")}</p>
                    <p className="mt-2 text-lg font-semibold">{Math.round(evaluation.confidence * 100)}%</p>
                  </div>
                  <div className="rounded-[24px] border border-border/70 bg-card/70 p-4">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{t("xp")}</p>
                    <p className="mt-2 text-lg font-semibold">{evaluation.xp_awarded}</p>
                  </div>
                </div>

                <div className="rounded-[28px] border border-border/70 bg-card/80 p-5">
                  <div className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">{t("tutorReply")}</p>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{evaluation.explanation}</p>
                  {!evaluation.correct ? (
                    <div className="mt-4 rounded-[24px] bg-muted p-4 text-sm">{evaluation.reteach_text}</div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3">
                  {evaluation.correct ? (
                    <Button onClick={goToNextModule}>
                      {activeModuleIndex < modules.length - 1 ? t("nextModule") : t("startAnotherTopic")}
                    </Button>
                  ) : (
                    <Button onClick={() => setStep("learn")} variant="secondary">
                      {t("reviewLessonAgain")}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!modules.length ? (
            <Card>
              <CardContent className="grid gap-4 p-8 md:grid-cols-3">
                <div className="rounded-[28px] bg-card/70 p-5">
                  <Sparkles className="h-6 w-6 text-primary" />
                  <p className="mt-4 font-semibold">{t("cardOneTitle")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("cardOneBody")}
                  </p>
                </div>
                <div className="rounded-[28px] bg-card/70 p-5">
                  <Sparkles className="h-6 w-6 text-accent" />
                  <p className="mt-4 font-semibold">{t("cardTwoTitle")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("cardTwoBody")}
                  </p>
                </div>
                <div className="rounded-[28px] bg-card/70 p-5">
                  <Sparkles className="h-6 w-6 text-warning" />
                  <p className="mt-4 font-semibold">{t("cardThreeTitle")}</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {t("cardThreeBody")}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
