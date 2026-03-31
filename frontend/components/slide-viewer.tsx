"use client";

import { ChevronLeft, ChevronRight, MessageCircle, Volume2 } from "lucide-react";

import { FloatingVoiceButton } from "@/components/floating-voice-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { LearningModule } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

type CoachMessage = {
  role: "user" | "coach";
  text: string;
};

export function SlideViewer({
  module,
  slideIndex,
  coachPrompt,
  coachMessages,
  onCoachPromptChange,
  onAskCoach,
  onSlideChange,
  language,
  coachLoading,
  token
}: {
  module: LearningModule;
  slideIndex: number;
  coachPrompt: string;
  coachMessages: CoachMessage[];
  onCoachPromptChange: (value: string) => void;
  onAskCoach: () => void | Promise<void>;
  onSlideChange: (nextIndex: number) => void;
  language: string;
  coachLoading: boolean;
  token: string;
}) {
  const slide = module.slides[slideIndex];
  const { t } = useUiCopy(language);

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(`${slide.title}. ${slide.body.join(". ")}`);
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="relative flex flex-row items-start justify-between gap-4">
        <div>
          <Badge className="mb-3 bg-white/75 text-primary dark:bg-slate-900/60">{t("currentModule")} {module.module_index}</Badge>
          <CardTitle className="text-3xl">{slide.title}</CardTitle>
        </div>
        <Button onClick={speak} variant="secondary">
          <Volume2 className="mr-2 h-4 w-4" />
          {t("narrate")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {slide.body.map((point) => (
            <div
              className="rounded-[26px] border border-border/70 bg-card/80 p-5 text-sm leading-6 dark:bg-slate-950/20"
              key={point}
            >
              {point}
            </div>
          ))}
        </div>

        <div className="rounded-[30px] border border-border/70 bg-card/80 p-5">
          <div className="mb-4 flex items-center gap-2">
            <MessageCircle className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold">{t("askCoach")}</p>
          </div>

          <div className="space-y-3">
            {coachMessages.length ? (
              coachMessages.map((message, index) => (
                <div
                  className={`max-w-[88%] rounded-[24px] px-4 py-3 text-sm leading-6 ${
                    message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                  key={`${message.role}-${index}`}
                >
                  {message.text}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-muted px-4 py-3 text-sm text-muted-foreground">
                {t("askCoachPlaceholder")}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            <Input
              className="flex-1"
              value={coachPrompt}
              onChange={(event) => onCoachPromptChange(event.target.value)}
              placeholder={t("askCoachPlaceholder")}
            />
            <FloatingVoiceButton
              language={language}
              onTranscript={(transcript) => onCoachPromptChange(`${coachPrompt} ${transcript}`.trim())}
              token={token}
            />
            <Button disabled={coachLoading || !coachPrompt.trim()} onClick={onAskCoach} variant="secondary">
              {coachLoading ? t("asking") : t("ask")}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <Button
            disabled={slideIndex === 0}
            onClick={() => onSlideChange(slideIndex - 1)}
            variant="secondary"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("previous")}
          </Button>
          <p className="text-sm text-muted-foreground">
            {t("slide")} {slideIndex + 1} {t("of")} {module.slides.length}
          </p>
          <Button
            disabled={slideIndex === module.slides.length - 1}
            onClick={() => onSlideChange(slideIndex + 1)}
            variant="secondary"
          >
            {t("next")}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
