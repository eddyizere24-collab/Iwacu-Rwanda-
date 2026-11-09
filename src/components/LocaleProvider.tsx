"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { intlLocale, normalizeLocale, translateText, type Locale } from "@/lib/i18n";

type I18nContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (value: string) => string;
  dateLocale: string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

// Keeps original text so a visitor can switch between any of the three languages
// without losing the source wording or requiring a page reload.
const originalText = new WeakMap<Text, string>();
const renderedText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Map<string, string>>();
const renderedAttributes = new WeakMap<Element, Map<string, string>>();

function localizeTextNode(node: Text, locale: Locale) {
  const current = node.data;
  let source = originalText.get(node);
  if (source === undefined || renderedText.get(node) !== current) {
    source = current;
    originalText.set(node, source);
  }
  const translated = translateText(source, locale);
  if (translated !== current) node.data = translated;
  renderedText.set(node, translated);
}

const LOCALIZED_ATTRIBUTES = ["aria-label", "aria-description", "title", "placeholder", "alt"];

function localizeElement(element: Element, locale: Locale) {
  let sources = originalAttributes.get(element);
  let rendered = renderedAttributes.get(element);
  if (!sources) {
    sources = new Map<string, string>();
    originalAttributes.set(element, sources);
  }
  if (!rendered) {
    rendered = new Map<string, string>();
    renderedAttributes.set(element, rendered);
  }

  for (const attribute of LOCALIZED_ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    const current = element.getAttribute(attribute) ?? "";
    let source = sources.get(attribute);
    if (source === undefined || rendered.get(attribute) !== current) {
      source = current;
      sources.set(attribute, source);
    }
    const translated = translateText(source, locale);
    if (translated !== current) element.setAttribute(attribute, translated);
    rendered.set(attribute, translated);
  }
}

function localizeSubtree(root: ParentNode, locale: Locale) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,noscript,textarea,[contenteditable='true']")) {
        return NodeFilter.FILTER_REJECT;
      }
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  let node: Node | null;
  while ((node = walker.nextNode())) localizeTextNode(node as Text, locale);

  if (root instanceof Element) localizeElement(root, locale);
  root.querySelectorAll?.("*").forEach((element) => localizeElement(element, locale));
}

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    try {
      window.localStorage.setItem("iwacu-locale", next);
      document.cookie = "iwacu-locale=" + next + "; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
      document.documentElement.lang = next;
    } catch {
      // The selected language still applies to the current page if storage is unavailable.
    }
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("iwacu-locale");
    if (saved && normalizeLocale(saved) !== locale) setLocaleState(normalizeLocale(saved));
    document.documentElement.lang = locale;
  }, [locale]);

  useEffect(() => {
    if (locale === "rw") {
      // Restore original text from the source language when switching back.
      localizeSubtree(document.body, "rw");
    } else {
      localizeSubtree(document.body, locale);
    }

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "characterData" && record.target instanceof Text) {
          localizeTextNode(record.target, locale);
        }
        for (const added of Array.from(record.addedNodes)) {
          if (added instanceof Text) localizeTextNode(added, locale);
          else if (added instanceof Element) localizeSubtree(added, locale);
        }
        if (record.type === "attributes" && record.target instanceof Element) {
          localizeElement(record.target, locale);
        }
      }
    });

    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: LOCALIZED_ATTRIBUTES,
    });
    return () => observer.disconnect();
  }, [locale]);

  const t = useCallback((value: string) => translateText(value, locale), [locale]);
  const value = useMemo(() => ({
    locale,
    setLocale,
    t,
    dateLocale: intlLocale(locale),
  }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside LocaleProvider");
  return context;
}
