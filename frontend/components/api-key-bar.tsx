"use client";

import { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { STORAGE_KEYS } from "@/lib/constants";
import { ProviderKeys } from "@/lib/types";
import { useUiCopy } from "@/lib/ui-copy";

export function ApiKeyBar({ language = "English" }: { language?: string }) {
  const [key, setKey] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const { t } = useUiCopy(language);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEYS.providerKeys);
    if (!raw) {
      setIsVisible(true);
      return;
    }
    try {
      const keys = JSON.parse(raw) as ProviderKeys;
      if (!keys.geminiApiKey) {
        setIsVisible(true);
      }
    } catch {
      setIsVisible(true);
    }
  }, []);

  const saveKey = () => {
    if (!key.trim()) return;
    
    const raw = window.localStorage.getItem(STORAGE_KEYS.providerKeys);
    let keys: ProviderKeys = { geminiApiKey: "" };
    if (raw) {
      try {
        keys = JSON.parse(raw);
      } catch {
        // ignore
      }
    }
    
    keys.geminiApiKey = key.trim();
    window.localStorage.setItem(STORAGE_KEYS.providerKeys, JSON.stringify(keys));
    setIsVisible(false);
    // Reload to ensure all requests use the new key
    window.location.reload();
  };

  if (!isVisible) return null;

  return (
    <div className="animate-in sticky top-0 z-[60] w-full border-b border-primary/20 bg-primary/10 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/20">
            <KeyRound className="h-4 w-4 text-primary" />
          </div>
          <div className="text-sm">
            <span className="font-semibold">{t("apiKeyBarTitle") || "Gemini API Key Missing"}</span>
            <p className="text-xs text-muted-foreground">
              {t("apiKeyBarSubtitle") || "Add your key to enable the AI coach and module generation."}
            </p>
          </div>
        </div>
        
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Input
            className="h-9 w-full min-w-[240px] border-primary/20 bg-background/50 sm:w-64"
            placeholder="Paste Gemini API Key..."
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
          <Button className="h-9 premium-gradient" onClick={saveKey} size="sm">
            <ShieldCheck className="mr-2 h-4 w-4" />
            {t("save") || "Save"}
          </Button>
          <button 
            className="ml-1 rounded-full p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
            onClick={() => setIsVisible(false)}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
