"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowRight, BrainCircuit, CheckCircle2, Lock, RefreshCw, Sparkles } from "lucide-react";

import { FloatingVoiceButton } from "@/components/floating-voice-button";
import { SlideViewer } from "@/components/slide-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { LEARNING_STYLES, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { EvaluationResponse, GenerateModulesResponse, LearningStyle } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

type StudioStep = "topic" | "learn" | "quiz" | "reteach" | "result";
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
  const [language, setLanguage] = useState(preferredLanguage || SUPPORTED_LANGUAGES[0]);
  const [learningStyle, setLearningStyle] = useState<LearningStyle>("Storytelling");
  const [activeModuleIndex, setActiveModuleIndex] = useState(0);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState<StudioStep>("topic");
  const [coachPrompt, setCoachPrompt] = useState("");
  const [coachMessages, setCoachMessages] = useState<CoachMessage[]>([]);
  const [coachLoading, setCoachLoading] = useState(false);
  const [completedModules, setCompletedModules] = useState<number[]>([]);
  const { t } = useUiCopy(language);

  const modules = modulesResponse?.modules ?? [];
  const activeModule = modules[activeModuleIndex] ?? null;
  const activeQuestion = useMemo(
    () => (activeModule ? activeModule.questions[activeQuestionIndex] ?? null : null),
    [activeModule, activeQuestionIndex]
  );
  const isFinalQuestion = activeModule ? activeQuestionIndex >= activeModule.questions.length - 1 : true;
  const isFinalModule = activeModuleIndex >= modules.length - 1;

  const moduleStepCounts = useMemo(() => {
    if (!activeModule) {
      return { completed: 0, total: 0, percent: 0, slidesDone: 0, slidesTotal: 0, quizDone: 0, quizTotal: 0 };
    }
    const slidesTotal = activeModule.slides.length;
    const quizTotal = activeModule.questions.length;
    const slidesDone = Math.min(slidesTotal, activeSlideIndex + 1);
    const quizDone =
      activeQuestionIndex + (step === "result" && evaluation?.correct ? 1 : 0);
    const total = slidesTotal + quizTotal;
    const completed = Math.min(total, slidesDone + quizDone);
    return {
      completed,
      total,
      percent: total ? Math.round((completed / total) * 100) : 0,
      slidesDone,
      slidesTotal,
      quizDone: Math.min(quizTotal, quizDone),
      quizTotal
    };
  }, [activeModule, activeQuestionIndex, activeSlideIndex, evaluation, step]);

  useEffect(() => {
    setLanguage(preferredLanguage || SUPPORTED_LANGUAGES[0]);
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
    setActiveQuestionIndex(0);
  }, [activeModuleIndex]);

  useEffect(() => {
    if (activeModuleIndex >= modules.length && modules.length) {
      setActiveModuleIndex(0);
    }
  }, [activeModuleIndex, modules.length]);

  useEffect(() => {
    if (!evaluation || !activeModule) return;

    if (evaluation.correct) {
      setStep("result");
      if (isFinalQuestion && activeModule.id && !completedModules.includes(activeModule.id)) {
        setCompletedModules((c) => [...c, activeModule.id!]);
      }
    } else {
      setStep("reteach");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [evaluation]);

  const goToNextModule = () => {
    if (!isFinalModule) {
      setActiveModuleIndex((c) => c + 1);
      setAnswer("");
      setStep("learn");
      return;
    }
    setActiveQuestionIndex(0);
    setStep("topic");
  };

  const goToNextQuestion = () => {
    if (!activeModule || activeQuestionIndex >= activeModule.questions.length - 1) return;
    setActiveQuestionIndex((c) => c + 1);
    setAnswer("");
    setStep("quiz");
  };

  const retryAfterReteach = () => {
    setAnswer("");
    setStep("quiz");
  };

  const sourceLabel =
    modulesResponse?.generation_source === "fallback"
      ? t("sourceFallback")
      : modulesResponse?.generation_source
        ? t("sourceAi")
        : null;

  return (
    <div className="space-y-8">
      {/* Step indicator */}
      <Card className="hero-panel border-white/10">
        <CardHeader className="relative z-10 pb-4">
          <CardTitle className="text-white flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t("lessonFlow")}
          </CardTitle>
          <CardDescription className="text-white/60">{t("lessonFlowSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="relative z-10 flex flex-wrap items-center gap-3">
          {[
            { id: "topic", label: t("stepTopic") },
            { id: "learn", label: t("stepLearn") },
            { id: "quiz", label: t("stepQuiz") },
            { id: "reteach", label: t("reteachTitle") },
            { id: "result", label: t("stepResult") }
          ].map((item) => (
            <Badge
              className={`px-4 py-1.5 transition-all ${
                step === item.id 
                  ? "premium-gradient text-white shadow-lg shadow-primary/25" 
                  : "bg-white/5 text-white/50 border-white/10 hover:bg-white/10 hover:text-white"
              }`}
              key={item.id}
            >
              {item.label}
            </Badge>
          ))}
          {sourceLabel && (
            <Badge className={`ml-auto border-none ${
              modulesResponse?.generation_source === "fallback" 
                ? "bg-amber-500/10 text-amber-400" 
                : "bg-emerald-500/10 text-emerald-400"
            }`}>
              {modulesResponse?.generation_source === "fallback" && <AlertCircle className="mr-1.5 h-3 w-3" />}
              {sourceLabel}
            </Badge>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-8 xl:grid-cols-[320px_minmax(0,1fr)]">
        {/* Left sidebar — module path */}
        <div className="space-y-6 animate-in">
          <Card className="glass overflow-hidden border-white/10">
            <CardHeader className="border-b border-white/5 bg-white/5">
              <CardTitle className="text-lg">{t("currentPath")}</CardTitle>
              <CardDescription>{t("currentPathSubtitle")}</CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {modules.length ? (
                <div className="space-y-2">
                  {modules.map((module, index) => {
                    const isCompleted = completedModules.includes(module.id ?? -1);
                    const isCurrent = index === activeModuleIndex;
                    const isUpcoming = index > activeModuleIndex && !isCompleted;

                    return (
                      <button
                        className={`w-full rounded-[20px] border p-4 text-left transition-all relative overflow-hidden group ${
                          isCurrent
                            ? "border-primary/40 bg-primary/10 shadow-sm"
                            : "border-white/5 bg-white/5 hover:bg-white/10"
                        } ${isUpcoming ? "opacity-50 grayscale" : ""}`}
                        disabled={isUpcoming}
                        key={module.id ?? `${module.module_index}-${module.title}`}
                        onClick={() => {
                          if (!isUpcoming) {
                            setActiveModuleIndex(index);
                            setStep("learn");
                          }
                        }}
                        type="button"
                      >
                        {isCurrent && <div className="absolute left-0 top-0 h-full w-1 premium-gradient" />}
                        <div className="flex items-start justify-between gap-3 relative z-10">
                          <div className="space-y-1.5">
                            <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/80">
                              {isCurrent
                                ? t("currentLesson")
                                : isCompleted
                                  ? t("completedLabel")
                                  : t("upcomingLesson")}
                            </p>
                            <p className="font-semibold text-sm leading-snug">{module.title}</p>
                            <p className="text-[11px] text-muted-foreground/70">
                              {t("lessonMeta", {
                                slides: module.slides.length,
                                questions: module.questions.length
                              })}
                            </p>
                          </div>
                          {isCompleted ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            </div>
                          ) : isUpcoming ? (
                            <Lock className="h-4 w-4 text-muted-foreground/50 mt-1" />
                          ) : isCurrent ? (
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                              <ArrowRight className="h-4 w-4 text-primary" />
                            </div>
                          ) : null}
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="rounded-[20px] border border-dashed border-white/10 p-6 text-center">
                  <p className="text-xs text-muted-foreground/60 leading-relaxed italic">{t("noActivePath")}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right main panel */}
        <div className="space-y-8 animate-in" style={{ animationDelay: "0.1s" }}>
          {/* ── 1. TOPIC SELECTOR ── */}
          {step === "topic" ? (
            <Card className="glass border-white/10 p-2">
              <CardHeader className="space-y-2">
                <CardTitle className="text-2xl font-bold tracking-tight">{t("startTopic")}</CardTitle>
                <CardDescription className="text-base">{t("startTopicSubtitle")}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">
                      {t("enterTopic")}
                    </label>
                    <Input
                      className="h-14 px-6 text-lg rounded-[22px] border-white/10 bg-white/5 focus:ring-primary/50 transition-all shadow-inner"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      placeholder="e.g. Quantum Physics, Cooking Pasta, History of Rome..."
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && topic.trim() && !generating) {
                          void onGenerateModules({ topic, language, learning_style: learningStyle });
                        }
                      }}
                    />
                  </div>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">
                        {t("language")}
                      </label>
                      <select 
                        className="flex h-12 w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                        value={language} 
                        onChange={(e) => setLanguage(e.target.value)}
                      >
                        {SUPPORTED_LANGUAGES.map((item) => (
                          <option key={item} value={item} className="bg-[#121214]">{item}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">
                        {t("actions")}
                      </label>
                      <select 
                        className="flex h-12 w-full items-center justify-between rounded-[18px] border border-white/10 bg-white/5 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                        value={learningStyle} 
                        onChange={(e) => setLearningStyle(e.target.value as LearningStyle)}
                      >
                        {LEARNING_STYLES.map((item) => (
                          <option key={item} value={item} className="bg-[#121214]">{item}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-[24px] bg-primary/5 border border-primary/10 p-5 text-sm text-primary/80">
                  <Sparkles className="h-5 w-5 shrink-0" />
                  <p>{t("shortPathHint")}</p>
                </div>

                <Button
                  className="h-14 w-full premium-gradient text-lg font-bold rounded-[22px] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all disabled:opacity-50 disabled:grayscale"
                  disabled={generating || !topic.trim()}
                  onClick={async () => {
                    await onGenerateModules({ topic, language, learning_style: learningStyle });
                    setCompletedModules([]);
                    setActiveModuleIndex(0);
                    setActiveQuestionIndex(0);
                    setAnswer("");
                    setStep("learn");
                  }}
                >
                  {generating ? (
                    <div className="flex items-center gap-3">
                      <RefreshCw className="h-5 w-5 animate-spin" />
                      {t("generating")}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      {t("generateTopicPath")}
                      <ArrowRight className="h-5 w-5" />
                    </div>
                  )}
                </Button>
              </CardContent>
            </Card>
          ) : null}

          {/* ── 2. LEARN (slides) ── */}
          {step === "learn" && activeModule ? (
            <div className="space-y-8">
              <Card className="glass border-white/10">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl">{t("moduleProgress")}</CardTitle>
                      <CardDescription>
                        {t("moduleProgressDetail", {
                          completed: moduleStepCounts.completed,
                          total: moduleStepCounts.total
                        })}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-3xl font-black text-primary/80">{moduleStepCounts.percent}%</p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full premium-gradient transition-all duration-700 ease-out shadow-[0_0_15px_rgba(168,85,247,0.4)]" 
                      style={{ width: `${moduleStepCounts.percent}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Badge className="bg-white/5 border-white/10 text-white/70 px-3 py-1 font-medium">
                      {t("slideProgress", {
                        current: moduleStepCounts.slidesDone,
                        total: moduleStepCounts.slidesTotal
                      })}
                    </Badge>
                    <Badge className="bg-white/5 border-white/10 text-white/70 px-3 py-1 font-medium">
                      {t("quizProgress", {
                        current: moduleStepCounts.quizDone,
                        total: moduleStepCounts.quizTotal
                      })}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <SlideViewer
                coachMessages={coachMessages}
                coachPrompt={coachPrompt}
                module={activeModule}
                coachLoading={coachLoading}
                onAskCoach={async () => {
                  if (!coachPrompt.trim()) return;
                  const prompt = coachPrompt;
                  const slide = activeModule.slides[activeSlideIndex];
                  setCoachMessages((c) => [...c, { role: "user", text: prompt }]);
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
                    setCoachMessages((c) => [...c, { role: "coach", text: reply }]);
                  } finally {
                    setCoachLoading(false);
                  }
                }}
                onCoachPromptChange={setCoachPrompt}
                onSlideChange={(nextIndex) => setActiveSlideIndex(nextIndex)}
                slideIndex={activeSlideIndex}
                language={language}
              />

              <div className="rounded-[32px] premium-gradient p-[1px] shadow-2xl shadow-primary/10">
                <Card className="bg-[#121214]/90 backdrop-blur-3xl rounded-[31px] border-none overflow-hidden">
                  <CardContent className="flex items-center justify-between p-8">
                    <div className="space-y-1">
                      <p className="text-lg font-bold text-white leading-tight">{t("readyForCheckpoint")}</p>
                      <p className="text-sm text-white/50">{t("readyForCheckpointSubtitle")}</p>
                    </div>
                    <Button 
                      className="h-12 px-8 rounded-full bg-white text-black hover:bg-white/90 transition-transform hover:scale-105 active:scale-95" 
                      onClick={() => setStep("quiz")}
                    >
                      {t("goToQuiz")}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          ) : null}

          {/* ── 3. QUIZ ── */}
          {step === "quiz" && activeModule && activeQuestion ? (
            <Card className="glass border-white/10 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 premium-gradient opacity-50" />
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="space-y-1">
                    <CardTitle className="text-2xl font-bold">{t("checkpointQuiz")}</CardTitle>
                    <CardDescription>{t("checkpointQuizSubtitle")}</CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-white/5 border-white/10 text-white font-mono px-3 py-1">
                      {activeQuestionIndex + 1} / {activeModule.questions.length}
                    </Badge>
                    <Badge className={`border-none ${
                        activeQuestion.difficulty === "easy" ? "bg-emerald-500/10 text-emerald-400" :
                        activeQuestion.difficulty === "medium" ? "bg-amber-500/10 text-amber-400" :
                        "bg-rose-500/10 text-rose-400"
                    }`}>
                        {activeQuestion.difficulty}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden mb-8">
                   <div className="h-full premium-gradient" style={{ width: `${moduleStepCounts.percent}%` }} />
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/5 p-8 shadow-inner">
                  <Badge variant="outline" className="mb-4 border-primary/30 text-primary px-3 py-0.5">{t("question")}</Badge>
                  <p className="text-xl font-medium text-white/90 leading-relaxed">{activeQuestion.prompt}</p>
                </div>

                <div className="space-y-3">
                    <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground/70 ml-1">
                        {t("answerPlaceholder")}
                    </label>
                    <Textarea
                    className="min-h-[140px] p-6 text-lg leading-relaxed rounded-[24px] border-white/10 bg-white/5 focus:ring-primary/50 transition-all"
                    placeholder="Express your thoughts here..."
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <Button
                    className="h-14 px-10 premium-gradient rounded-full text-lg font-bold shadow-xl shadow-primary/20 disabled:opacity-50 disabled:grayscale transition-transform hover:scale-[1.02] active:scale-[0.98]"
                    disabled={evaluating || !answer.trim() || !activeModule.id}
                    onClick={async () => {
                      if (!activeModule.id) return;
                      await onEvaluate({
                        module_id: activeModule.id,
                        questionIndex: activeQuestionIndex,
                        user_answer: answer
                      });
                    }}
                  >
                    {evaluating ? (
                        <div className="flex items-center gap-3">
                            <RefreshCw className="h-5 w-5 animate-spin" />
                            {t("evaluating")}
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {t("checkAnswer")}
                            <ArrowRight className="h-5 w-5" />
                        </div>
                    )}
                  </Button>
                  <Button onClick={() => setStep("learn")} variant="secondary" className="h-14 px-8 rounded-full border-white/10 bg-white/5 hover:bg-white/10">
                    {t("backToLesson")}
                  </Button>
                </div>
              </CardContent>
              <FloatingVoiceButton
                language={language}
                onTranscript={(transcript) => setAnswer((c) => `${c} ${transcript}`.trim())}
                token={token}
              />
            </Card>
          ) : null}

          {/* ── 4. RETEACH (wrong answer) ── */}
          {step === "reteach" && evaluation && activeModule ? (
            <Card className="glass border-rose-500/20 shadow-2xl shadow-rose-900/10">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-rose-500/10">
                    <RefreshCw className="h-6 w-6 text-rose-400" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">{t("reteachTitle")}</CardTitle>
                    <CardDescription>{t("reteachSubtitle")}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">{t("confidence")}</p>
                    <div className="mt-3 flex items-end gap-2">
                        <p className="text-3xl font-black text-rose-400">{Math.round(evaluation.confidence * 100)}%</p>
                        <p className="text-xs text-muted-foreground/40 mb-1.5">Similarity index</p>
                    </div>
                  </div>
                  <div className="rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">{t("xp")}</p>
                    <div className="mt-3 flex items-end gap-2">
                        <p className="text-3xl font-black text-white">+{evaluation.xp_awarded}</p>
                        <p className="text-xs text-muted-foreground/40 mb-1.5">Gained this try</p>
                    </div>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/5 bg-white/5 p-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-primary transition-colors" />
                  <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-primary/80">{t("tutorReply")}</p>
                  </div>
                  <p className="text-lg text-white/80 leading-relaxed italic">&ldquo;{evaluation.explanation}&rdquo;</p>
                </div>

                <div className="rounded-[32px] border border-rose-500/10 bg-rose-500/5 p-8 relative overflow-hidden">
                  <div className="absolute bottom-0 right-0 p-4 opacity-10">
                    <AlertCircle className="h-16 w-16" />
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest text-rose-400 mb-4">{t("reteachTitle")}</p>
                  <p className="text-lg text-rose-200/90 leading-relaxed font-medium">{evaluation.reteach_text}</p>
                </div>

                <div className="flex flex-wrap gap-4 pt-2">
                  <Button className="h-14 px-10 rounded-full bg-white text-black hover:bg-white/90 font-bold px-8" onClick={() => setStep("learn")}>
                    {t("backToSlides")}
                  </Button>
                  <Button onClick={retryAfterReteach} variant="secondary" className="h-14 px-8 rounded-full border-white/10 bg-white/5 hover:bg-white/10 font-bold">
                    <RefreshCw className="mr-2 h-5 w-5" />
                    {t("tryAgain")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* ── 5. RESULT (correct answer) ── */}
          {step === "result" && evaluation && activeModule ? (
            <Card className="glass border-emerald-500/20 shadow-2xl shadow-emerald-900/10 overflow-hidden relative">
              <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full" />
              <CardHeader className="pb-4 relative z-10">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[22px] bg-emerald-500/10">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400" />
                  </div>
                  <div>
                    <CardTitle className="text-3xl font-black text-white">{t("resultGoodTitle")}</CardTitle>
                    <CardDescription className="text-base text-emerald-400/70 font-medium">
                      {isFinalQuestion
                        ? isFinalModule
                          ? t("allModulesCompleteSubtitle")
                          : t("resultGoodSubtitle")
                        : t("resultCheckpointSubtitle")}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-8 relative z-10">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 mb-2">{t("result")}</p>
                    <p className="text-2xl font-bold text-emerald-400 tracking-tight">{t("correct")}</p>
                  </div>
                  <div className="rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 mb-2">{t("confidence")}</p>
                    <p className="text-2xl font-black text-white">{Math.round(evaluation.confidence * 100)}%</p>
                  </div>
                  <div className="rounded-[24px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm text-center">
                    <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60 mb-2">{t("xp")}</p>
                    <p className="text-2xl font-black text-white">+{evaluation.xp_awarded}</p>
                  </div>
                </div>

                <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-inner bg-gradient-to-br from-white/5 to-white/[0.02]">
                  <div className="flex items-center gap-2 mb-4">
                    <BrainCircuit className="h-5 w-5 text-primary" />
                    <p className="text-sm font-bold uppercase tracking-widest text-primary/80">{t("tutorReply")}</p>
                  </div>
                  <p className="text-xl text-white/90 leading-relaxed font-medium">&ldquo;{evaluation.explanation}&rdquo;</p>
                </div>

                <div className="flex flex-wrap gap-4">
                  {isFinalQuestion ? (
                    isFinalModule ? (
                      <Button className="h-14 px-10 premium-gradient rounded-full text-lg font-bold shadow-xl shadow-primary/20" onClick={() => { setStep("topic"); setModulesResponseReset(); }}>
                        {t("startAnotherTopic")}
                      </Button>
                    ) : (
                      <Button className="h-14 px-10 premium-gradient rounded-full text-lg font-bold shadow-xl shadow-primary/20" onClick={goToNextModule}>
                        {t("nextModule")}
                        <ArrowRight className="ml-3 h-5 w-5" />
                      </Button>
                    )
                  ) : (
                    <Button className="h-14 px-10 premium-gradient rounded-full text-lg font-bold shadow-xl shadow-primary/20" onClick={goToNextQuestion}>
                      {t("nextQuestion")}
                      <ArrowRight className="ml-3 h-5 w-5" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* ── Empty state (Welcome) ── */}
          {!modules.length && step === "topic" ? (
            <Card className="glass border-white/10 overflow-hidden">
              <CardContent className="grid gap-6 p-10 md:grid-cols-3">
                <div className="group space-y-4 p-4 rounded-[28px] transition-all hover:bg-white/5">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-primary/10 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-lg font-bold">{t("cardOneTitle")}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("cardOneBody")}</p>
                </div>
                <div className="group space-y-4 p-4 rounded-[28px] transition-all hover:bg-white/5">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-accent/10 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-accent" />
                  </div>
                  <p className="text-lg font-bold">{t("cardTwoTitle")}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("cardTwoBody")}</p>
                </div>
                <div className="group space-y-4 p-4 rounded-[28px] transition-all hover:bg-white/5">
                  <div className="h-12 w-12 flex items-center justify-center rounded-2xl bg-amber-500/10 group-hover:scale-110 transition-transform">
                    <Sparkles className="h-6 w-6 text-amber-400" />
                  </div>
                  <p className="text-lg font-bold">{t("cardThreeTitle")}</p>
                  <p className="text-sm text-muted-foreground leading-relaxed">{t("cardThreeBody")}</p>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );

  function setModulesResponseReset() {
    // Parent handle clearing
  }
}
