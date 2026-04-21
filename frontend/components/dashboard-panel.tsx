"use client";

import { useState } from "react";
import { Award, ChevronDown, ChevronUp, Languages, PlayCircle, PlusCircle, Target, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardSummary } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

export function DashboardPanel({
  learnerName,
  language,
  summary,
  onContinueLearning,
  onStartNewTopic
}: {
  learnerName: string;
  language: string;
  summary: DashboardSummary | null;
  onContinueLearning: () => void;
  onStartNewTopic: () => void;
}) {
  const { t } = useUiCopy(language);
  const [expanded, setExpanded] = useState(false);
  const currentModule =
    summary?.modules.find((module) => module.status !== "completed") ??
    summary?.modules[summary.modules.length - 1];
  const completedModules = (summary?.modules ?? []).filter((module) => module.status === "completed");

  const cards = [
    {
      label: t("yourProgress"),
      value: `${summary?.overall_progress ?? 0}%`,
      icon: Target,
      color: "text-primary"
    },
    {
      label: t("completed"),
      value: `${summary?.completed_modules ?? 0}/${summary?.total_modules ?? 0}`,
      icon: Award,
      color: "text-emerald-400"
    },
    {
      label: t("xp"),
      value: `${summary?.total_xp ?? 0}`,
      icon: PlayCircle,
      color: "text-amber-400"
    },
    {
      label: t("language"),
      value: language,
      icon: Languages,
      color: "text-sky-400"
    }
  ];

  return (
    <div className="space-y-10 animate-in">
      <Card className="glass border-white/10 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] -mr-32 -mt-32 rounded-full transition-transform group-hover:scale-110" />
        
        <CardHeader className="space-y-4 relative z-10 p-8">
          <Badge className="w-fit bg-primary/10 text-primary border-primary/20">{t("yourProgress")}</Badge>
          <div>
            <CardTitle className="text-4xl font-black tracking-tight text-white mb-2">
                {currentModule?.title ?? t("continueLearning")}
            </CardTitle>
            <CardDescription className="text-lg text-white/50 italic">
                &ldquo;{currentModule
                ? t("confidenceAttempts", { score: currentModule.score, attempts: currentModule.attempts })
                : t("startLearningPrompt")}&rdquo;
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-8 relative z-10 p-8 pt-0">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {cards.map((card) => (
              <div
                className="rounded-[28px] border border-white/5 bg-white/5 p-6 backdrop-blur-sm transition-all hover:bg-white/10 hover:border-white/10 group/card"
                key={card.label}
              >
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground/60">{card.label}</p>
                  <card.icon className={`h-5 w-5 ${card.color} group-hover/card:scale-110 transition-transform`} />
                </div>
                <p className="text-3xl font-black text-white">{card.value}</p>
              </div>
            ))}
          </div>

          <Button 
            className="h-16 w-full premium-gradient text-lg font-bold rounded-[22px] shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-[0.99]" 
            onClick={onContinueLearning}
          >
            <PlayCircle className="mr-3 h-6 w-6" />
            {t("continueLearning")}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-8 md:grid-cols-2">
        <Card className="glass border-white/10 overflow-hidden">
          <CardHeader className="bg-white/5 p-6 border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-primary" />
                {t("actions")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <Button className="h-12 w-full premium-gradient font-bold rounded-2xl" onClick={onContinueLearning}>
              {t("continueLearning")}
            </Button>
            <Button className="h-12 w-full glass border-white/10 hover:bg-white/10 font-bold rounded-2xl" onClick={onStartNewTopic} variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" />
              {t("startNewTopic")}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass border-white/10 overflow-hidden">
          <CardHeader className="bg-white/5 p-6 border-b border-white/5">
            <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                {t("focus")}
            </CardTitle>
            <CardDescription className="text-primary/70 font-medium">{learnerName}</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="flex flex-wrap gap-2.5">
                {(summary?.weak_areas ?? []).length ? (
                summary?.weak_areas.slice(0, 6).map((item) => (
                    <Badge variant="outline" className="bg-rose-500/5 text-rose-300 border-rose-500/20 px-3 py-1.5 rounded-full" key={item}>
                    {item}
                    </Badge>
                ))
                ) : (
                <div className="flex items-center gap-2 text-muted-foreground/60 py-4 italic">
                    <Sparkles className="h-4 w-4" />
                    <p className="text-sm">{t("noWeakAreas")}</p>
                </div>
                )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="glass border-white/10 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between gap-4 p-8">
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold">{t("completedModules")}</CardTitle>
            <CardDescription className="text-emerald-400/70 font-medium">{t("finishedCount", { count: completedModules.length })}</CardDescription>
          </div>
          <button
            className="h-10 px-4 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-colors inline-flex items-center gap-2 text-sm font-semibold"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {expanded ? t("hide") : t("show")}
          </button>
        </CardHeader>
        {expanded ? (
          <CardContent className="p-8 pt-0 space-y-3 max-h-[400px] overflow-y-auto">
            {completedModules.length ? (
              completedModules.map((module) => (
                <div
                  className="rounded-[24px] border border-white/5 bg-white/5 p-5 flex items-center justify-between group hover:bg-white/[0.08] transition-colors"
                  key={module.module_id}
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 flex items-center justify-center rounded-2xl bg-emerald-500/10">
                        <Award className="h-5 w-5 text-emerald-400" />
                    </div>
                    <p className="font-bold text-white/90">{module.title}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 font-black">{module.score}%</Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 border border-dashed border-white/10 rounded-[32px]">
                <p className="text-muted-foreground/60 italic">{t("noCompletedModules")}</p>
              </div>
            )}
          </CardContent>
        ) : null}
      </Card>
    </div>
  );
}
