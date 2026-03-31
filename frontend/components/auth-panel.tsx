"use client";

import { useState } from "react";

import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useUiCopy } from "@/lib/ui-copy";

type AuthMode = "signup" | "login";

export function AuthPanel({
  mode,
  loading,
  error,
  language = "English",
  onModeChange,
  onLogin,
  onSignup
}: {
  mode: AuthMode;
  loading: boolean;
  error: string;
  language?: string;
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
    language: "English",
    interests: ""
  });
  const [loginForm, setLoginForm] = useState({
    email: "",
    password: ""
  });
  const { t } = useUiCopy(mode === "signup" ? signupForm.language : language);

  return (
    <Card className="max-w-xl border-border/70 bg-card text-foreground shadow-none">
      <CardHeader>
        <CardTitle>{mode === "signup" ? t("createProfile") : t("welcomeBack")}</CardTitle>
        <CardDescription>
          {t("authSubtitle")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="inline-flex rounded-full border border-border bg-muted p-1">
          <button
            className={`rounded-full px-4 py-2 text-sm ${mode === "signup" ? "bg-card font-semibold" : "text-muted-foreground"}`}
            onClick={() => onModeChange("signup")}
            type="button"
          >
            {t("signUp")}
          </button>
          <button
            className={`rounded-full px-4 py-2 text-sm ${mode === "login" ? "bg-card font-semibold" : "text-muted-foreground"}`}
            onClick={() => onModeChange("login")}
            type="button"
          >
            {t("login")}
          </button>
        </div>

        {mode === "signup" ? (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await onSignup(signupForm);
            }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                placeholder={t("fullName")}
                value={signupForm.name}
                onChange={(event) => setSignupForm((current) => ({ ...current, name: event.target.value }))}
              />
              <Input
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
            <Input
              type="email"
              placeholder={t("email")}
              value={signupForm.email}
              onChange={(event) => setSignupForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              type="password"
              placeholder={t("password")}
              value={signupForm.password}
              onChange={(event) => setSignupForm((current) => ({ ...current, password: event.target.value }))}
            />
            <Select
              value={signupForm.language}
              onChange={(event) => setSignupForm((current) => ({ ...current, language: event.target.value }))}
            >
              <option value="English">English</option>
              {SUPPORTED_LANGUAGES.map((language) => (
                <option key={language} value={language}>
                  {language}
                </option>
              ))}
            </Select>
            <Textarea
              placeholder={t("interestsPlaceholder")}
              value={signupForm.interests}
              onChange={(event) => setSignupForm((current) => ({ ...current, interests: event.target.value }))}
            />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? t("creatingAccount") : t("startLearning")}
            </Button>
          </form>
        ) : (
          <form
            className="space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              await onLogin(loginForm);
            }}
          >
            <Input
              type="email"
              placeholder={t("email")}
              value={loginForm.email}
              onChange={(event) => setLoginForm((current) => ({ ...current, email: event.target.value }))}
            />
            <Input
              type="password"
              placeholder={t("password")}
              value={loginForm.password}
              onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
            />
            <Button className="w-full" disabled={loading} type="submit">
              {loading ? t("signingIn") : t("continue")}
            </Button>
          </form>
        )}

        {error ? <p className="text-sm text-rose-500">{error}</p> : null}
      </CardContent>
    </Card>
  );
}
