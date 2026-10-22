import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import {
  choiceMade,
  dictionaryFailed,
  preferenceFeedbackStore,
} from "../features/preferences/preference-feedback-state";
import {
  readLocalUserPreferences,
  userPreferencesStorageKey,
  writeLocalUserPreferences,
} from "../lib/user-preferences";
import { fetchDictionary } from "./dictionary-resources";
import { en } from "./locales/en";

export const supportedLocales = ["en", "ru", "uk", "he"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const languageStorageKey = userPreferencesStorageKey;

let localeRequest = 0;

type LocaleChangeOptions = {
  shouldApply?: () => boolean;
  source?: "user" | "account";
};

export function resolveLocale(storedLocale: string | null, browserLanguage?: string): SupportedLocale {
  if (supportedLocales.includes(storedLocale as SupportedLocale)) {
    return storedLocale as SupportedLocale;
  }

  const browserLocale = browserLanguage?.toLowerCase().split("-")[0];
  return supportedLocales.includes(browserLocale as SupportedLocale) ? (browserLocale as SupportedLocale) : "en";
}

async function ensureLocaleResources(locale: SupportedLocale) {
  if (i18n.hasResourceBundle(locale, "translation") || locale === "en") {
    return;
  }

  const resources = await fetchDictionary(locale);
  i18n.addResourceBundle(locale, "translation", resources, true, true);
}

function applyDocumentLocale(locale: SupportedLocale) {
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === "he" ? "rtl" : "ltr";
}

export async function initializeI18n() {
  const locale = resolveLocale(readLocalUserPreferences().language, window.navigator.language);

  if (!i18n.isInitialized) {
    await i18n.use(initReactI18next).init({
      resources: { en: { translation: en } },
      lng: "en",
      fallbackLng: "en",
      supportedLngs: supportedLocales,
      interpolation: { escapeValue: false },
      react: { useSuspense: false },
    });
  }

  try {
    await changeLocale(locale, { source: "account" });
  } catch {
    await i18n.changeLanguage("en");
    applyDocumentLocale("en");
  }
}

export async function changeLocale(locale: SupportedLocale, options: LocaleChangeOptions = {}) {
  if (options.shouldApply && !options.shouldApply()) {
    return false;
  }
  const request = ++localeRequest;
  const isUserChoice = options.source !== "account";
  if (isUserChoice) {
    preferenceFeedbackStore.dispatch(choiceMade("language"));
  }
  const isCurrent = () => request === localeRequest && (options.shouldApply?.() ?? true);
  try {
    await ensureLocaleResources(locale);
    if (!isCurrent()) {
      return false;
    }
    // Resources are loaded: the supported callback commits in the activation turn,
    // before a queued owner change can interrupt the document/cache update.
    return await new Promise<boolean>((resolve, reject) => {
      void i18n.changeLanguage(locale, (error) => {
        const activeLocale = resolveLocale(i18n.resolvedLanguage ?? i18n.language);
        applyDocumentLocale(activeLocale);
        if (error) {
          reject(error);
          return;
        }
        if (request !== localeRequest || activeLocale !== locale) {
          resolve(false);
          return;
        }
        preferenceFeedbackStore.dispatch(dictionaryFailed(null));
        if (isUserChoice) {
          writeLocalUserPreferences({ language: locale });
        }
        resolve(true);
      });
    });
  } catch {
    if (!isCurrent()) {
      return false;
    }
    preferenceFeedbackStore.dispatch(dictionaryFailed(locale));
    throw new Error("The language resources could not be loaded");
  }
}

export { i18n };
