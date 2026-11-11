"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type TextScale = "100" | "125" | "150" | "200";

export interface AccessibilitySettings {
  textScale: TextScale;
  highContrast: boolean;
  reducedMotion: boolean;
  lowDataMode: boolean;
  easyUseMode: boolean;
}

interface AccessibilityContextValue extends AccessibilitySettings {
  setTextScale: (value: TextScale) => void;
  setHighContrast: (value: boolean) => void;
  setReducedMotion: (value: boolean) => void;
  setLowDataMode: (value: boolean) => void;
  setEasyUseMode: (value: boolean) => void;
  resetAccessibilitySettings: () => void;
}

const STORAGE_KEY = "iwacu-accessibility-v1";

export const DEFAULT_ACCESSIBILITY_SETTINGS: AccessibilitySettings = {
  textScale: "100",
  highContrast: false,
  reducedMotion: false,
  lowDataMode: false,
  easyUseMode: false,
};

function isTextScale(value: unknown): value is TextScale {
  return value === "100" || value === "125" || value === "150" || value === "200";
}

export function normalizeAccessibilitySettings(value: unknown): AccessibilitySettings {
  if (!value || typeof value !== "object") return { ...DEFAULT_ACCESSIBILITY_SETTINGS };
  const candidate = value as Partial<AccessibilitySettings>;
  return {
    textScale: isTextScale(candidate.textScale) ? candidate.textScale : "100",
    highContrast: candidate.highContrast === true,
    reducedMotion: candidate.reducedMotion === true,
    lowDataMode: candidate.lowDataMode === true,
    easyUseMode: candidate.easyUseMode === true,
  };
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<AccessibilitySettings>(DEFAULT_ACCESSIBILITY_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setSettings(normalizeAccessibilitySettings(JSON.parse(saved)));
    } catch {
      // Accessibility settings remain usable for the current visit when storage is blocked.
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.iwacuTextSize = settings.textScale;
    root.dataset.iwacuContrast = settings.highContrast ? "high" : "normal";
    root.dataset.iwacuReducedMotion = settings.reducedMotion ? "true" : "false";
    root.dataset.iwacuLowData = settings.lowDataMode ? "true" : "false";
    root.dataset.iwacuEasyUse = settings.easyUseMode ? "true" : "false";

    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Preferences still apply in memory if browser storage is unavailable.
    }
  }, [settings, hydrated]);

  const update = useCallback(<K extends keyof AccessibilitySettings>(
    key: K,
    value: AccessibilitySettings[K],
  ) => {
    setSettings((current) => ({ ...current, [key]: value }));
  }, []);

  const resetAccessibilitySettings = useCallback(() => {
    setSettings({ ...DEFAULT_ACCESSIBILITY_SETTINGS });
  }, []);

  const value = useMemo<AccessibilityContextValue>(() => ({
    ...settings,
    setTextScale: (next) => update("textScale", next),
    setHighContrast: (next) => update("highContrast", next),
    setReducedMotion: (next) => update("reducedMotion", next),
    setLowDataMode: (next) => update("lowDataMode", next),
    setEasyUseMode: (next) => update("easyUseMode", next),
    resetAccessibilitySettings,
  }), [settings, update, resetAccessibilitySettings]);

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibilitySettings(): AccessibilityContextValue {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error("useAccessibilitySettings must be used inside AccessibilityProvider");
  return context;
}
