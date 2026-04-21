"use client";

import { useState } from "react";
import { Lock, Mail, User, UserPlus, Sparkles } from "lucide-react";

import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useUiCopy } from "@/lib/ui-copy";

type AuthMode = "signup" | "login";

export function AuthPanel({
  mode,
  loading,
  error,
  onModeChange,
  onLogin,
  onSignup
}: {
  mode: AuthMode;
  loading: boolean;
  error: string;
  onModeChange: (mode: AuthMode) => void;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onSignup: (payload: {
    name: string;
    email: string;
    password: string;
    age: number;
    language: string;
    interests: string;
  }) => Promise<void>;
}) {
  const [signupForm, setSignupForm] = useState<{
    name: string;
    email: string;
    password: string;
    age: number;
    language: string;
    interests: string;
  }>({
    name: "",
    email: "",
    password: "",
    age: 16,
    language: SUPPORTED_LANGUAGES[0],
    interests: ""
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const { t } = useUiCopy(mode === "signup" ? signupForm.language : "English");

  return (
    <Card className="max-w-xl glass border-white/10 shadow-2xl overflow-hidden mt-6">
      <div className="absolute top-0 left-0 w-full h-1 premium-gradient" />
      <CardHeader className="space-y-4 p-8">
        <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-bold uppercase tracking-widest text-primary/80">Premium Access</span>
        </div>
        <CardTitle className="text-3xl font-black tracking-tight text-white">
            {mode === "signup" ? t("createProfile") : t("welcomeBack")}
        </CardTitle>
        <CardDescription className="text-white/50 text-base leading-relaxed italic">
          {t("authSubtitle")}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-8 p-8 pt-0">
        <div className="flex items-center p-1.5 bg-white/5 rounded-full border border-white/5 w-fit">
          <button
            className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                mode === "signup" 
                    ? "premium-gradient text-white shadow-lg shadow-primary/20 scale-105" 
                    : "text-white/40 hover:text-white/60"
            }`}
            onClick={() => onModeChange("signup")}
            type="button"
          >
            {t("signUp")}
          </button>
          <button
            className={`rounded-full px-6 py-2 text-sm font-bold transition-all ${
                mode === "login" 
                    ? "premium-gradient text-white shadow-lg shadow-primary/20 scale-105" 
                    : "text-white/40 hover:text-white/60"
            }`}
            onClick={() => onModeChange("login")}
            type="button"
          >
            {t("login")}
          </button>
        </div>

        {mode === "signup" ? (
          <form
            className="space-y-5 animate-in"
            onSubmit={async (event) => {
              event.preventDefault();
              await onSignup(signupForm);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <User className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
                <Input
                  className="h-11 pl-11 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50"
                  placeholder={t("fullName")}
                  value={signupForm.name}
                  onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
                />
              </div>
              <Input
                className="h-11 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50"
                type="number"
                min={5}
                max={120}
                placeholder={t("age")}
                value={signupForm.age}
                onChange={(event) =>
                  setSignupForm((current) => ({ ...current, age: Number(event.target.value) || current.age }))
                }
              />
            </div>
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
              <Input
                className="h-11 pl-11 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50"
                type="email"
                placeholder={t("email")}
                value={signupForm.email}
                onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
              <Input
                className="h-11 pl-11 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50"
                type="password"
                placeholder={t("password")}
                value={signupForm.password}
                onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Learning Language</label>
                <select 
                    className="flex h-11 w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50"
                    value={signupForm.language} 
                    onChange={(e) => setSignupForm((current) => ({ ...current, language: e.target.value }))}
                >
                    {SUPPORTED_LANGUAGES.map((language) => (
                    <option key={language} value={language} className="bg-[#121214]">
                        {language}
                    </option>
                    ))}
                </select>
            </div>
            <div className="space-y-1.5">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40 ml-1">Your Interests</label>
                <Textarea
                className="min-h-[100px] rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50 p-4"
                placeholder={t("interestsPlaceholder")}
                value={signupForm.interests}
                onChange={(event) => setSignupForm((current) => ({ ...current, interests: event.target.value }))}
                />
            </div>
            <Button className="h-12 w-full premium-gradient font-bold rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-transform active:scale-[0.99] mt-2" disabled={loading} type="submit">
              {loading ? (
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    {t("creatingAccount")}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("startLearning")}
                </div>
              )}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-5 animate-in"
            onSubmit={async (event) => {
              event.preventDefault();
              await onLogin(loginForm);
            }}
          >
            <div className="relative">
              <Mail className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
              <Input
                className="h-12 pl-12 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50 text-lg"
                type="email"
                placeholder={t("email")}
                value={loginForm.email}
                onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-4 top-3.5 h-4 w-4 text-white/30" />
              <Input
                className="h-12 pl-12 rounded-2xl border-white/10 bg-white/5 focus:ring-primary/50 text-lg"
                type="password"
                placeholder={t("password")}
                value={loginForm.password}
                onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
              />
            </div>
            <Button className="h-14 w-full premium-gradient font-bold text-lg rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.01] transition-all active:scale-[0.99] mt-4" disabled={loading} type="submit">
              {loading ? (
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    {t("signingIn")}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                    {t("continue")}
                    <ArrowRight className="h-5 w-5" />
                </div>
              )}
            </Button>
          </form>
        )}

        {error ? (
            <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-4 text-rose-400 text-sm flex items-center gap-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
            </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// Simple imports for icons used in the revamped version but missing in original
import { RefreshCw, ArrowRight, AlertCircle } from "lucide-react";
