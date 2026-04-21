"use client";

import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, GraduationCap, MessageCircle, Volume2, Sparkles, Send } from "lucide-react";

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
  coachLoading
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
}) {
  const slide = module.slides[slideIndex];
  const { t } = useUiCopy(language);
  const [notesOpen, setNotesOpen] = useState(false);

  const speak = () => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      return;
    }
    const text = [slide.title, ...slide.body].join(". ");
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const handleCoachKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey && coachPrompt.trim()) {
      event.preventDefault();
      void onAskCoach();
    }
  };

  return (
    <Card className="glass border-white/10 overflow-hidden relative">
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient opacity-30" />
      <CardHeader className="relative flex flex-row items-start justify-between gap-4 p-8">
        <div className="space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 rounded-full px-3">
            {t("currentModule")} {module.module_index}
          </Badge>
          <CardTitle className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
            {slide.title}
          </CardTitle>
        </div>
        <Button onClick={speak} size="icon" variant="secondary" className="glass h-12 w-12 rounded-2xl hover:scale-105 active:scale-95 transition-transform">
          <Volume2 className="h-5 w-5 text-white" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-10 p-8 pt-0">
        <div className="grid gap-6 md:grid-cols-3">
          {slide.body.map((point, i) => (
            <div
              className={`animate-in rounded-[32px] border border-white/5 bg-white/5 p-6 text-base leading-relaxed text-white/80 backdrop-blur-sm transition-all hover:bg-white/[0.08] hover:border-white/10 group shadow-inner flex flex-col items-center justify-center text-center py-10`}
              key={`${slideIndex}-${i}`}
              style={{ animationDelay: `${i * 0.1}s` }}
            >
              <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center mb-6 text-primary font-black text-xs border border-primary/10">
                {i + 1}
              </div>
              {point}
            </div>
          ))}
        </div>

        {slide.speaker_note ? (
          <div className="rounded-[28px] border border-white/5 bg-white/5 overflow-hidden group">
            <button
              className="flex w-full items-center justify-between px-6 py-4 text-sm font-bold text-white/50 hover:bg-white/5 transition-colors"
              onClick={() => setNotesOpen((v) => !v)}
              type="button"
            >
              <span className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/10">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                </div>
                {notesOpen ? t("hideNotes") : t("showNotes")}
              </span>
              {notesOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {notesOpen && (
              <div className="border-t border-white/5 px-8 py-6 text-base leading-relaxed text-white/60 italic animate-in">
                &ldquo;{slide.speaker_note}&rdquo;
              </div>
            )}
          </div>
        ) : null}

        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <MessageCircle className="h-16 w-16" />
          </div>
          
          <div className="mb-6 flex items-center gap-3 relative z-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/20">
                <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <p className="text-sm font-bold uppercase tracking-widest text-primary/80">{t("askCoach")}</p>
          </div>

          <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2 relative z-10">
            {coachMessages.length ? (
              coachMessages.map((message, index) => (
                <div
                  className={`max-w-[85%] rounded-[24px] px-5 py-3.5 text-base leading-relaxed transition-all animate-in ${
                    message.role === "user"
                      ? "ml-auto premium-gradient text-white shadow-lg shadow-primary/20"
                      : "bg-white/10 text-white/90 border border-white/5"
                  }`}
                  key={`${message.role}-${index}`}
                >
                  {message.text}
                </div>
              ))
            ) : (
              <div className="rounded-[24px] bg-white/5 border border-dashed border-white/10 px-6 py-4 text-sm text-white/40 italic">
                {t("askCoachPlaceholder")}
              </div>
            )}
          </div>

          <div className="mt-8 flex items-center gap-3 relative z-10">
            <Input
              className="h-12 px-6 rounded-2xl border-white/5 bg-white/5 focus:ring-primary/50 text-white placeholder:text-white/20"
              value={coachPrompt}
              onChange={(event) => onCoachPromptChange(event.target.value)}
              onKeyDown={handleCoachKeyDown}
              placeholder="Ask anything about this slide..."
            />
            <Button 
                className={`h-12 w-12 rounded-2xl flex items-center justify-center transition-all ${
                    coachPrompt.trim() 
                        ? "premium-gradient text-white shadow-lg shadow-primary/20 hover:scale-105 active:scale-95" 
                        : "bg-white/5 text-white/20"
                }`}
                disabled={coachLoading || !coachPrompt.trim()} 
                onClick={onAskCoach}
                size="icon"
            >
              {coachLoading ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            className="h-11 px-6 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all font-bold"
            disabled={slideIndex === 0}
            onClick={() => onSlideChange(slideIndex - 1)}
            variant="secondary"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            {t("previous")}
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-black text-white/30">{t("slide")}</span>
            <Badge variant="outline" className="h-7 border-primary/30 text-primary font-mono">{slideIndex + 1}</Badge>
            <span className="text-sm font-black text-white/30">{t("of")}</span>
            <Badge variant="outline" className="h-7 border-white/10 text-white/50 font-mono">{module.slides.length}</Badge>
          </div>

          <Button
            className={`h-11 px-6 rounded-xl transition-all font-bold ${
                slideIndex === module.slides.length - 1 
                    ? "opacity-50 pointer-events-none" 
                    : "premium-gradient shadow-lg shadow-primary/10"
            }`}
            disabled={slideIndex === module.slides.length - 1}
            onClick={() => onSlideChange(slideIndex + 1)}
          >
            {t("next")}
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
