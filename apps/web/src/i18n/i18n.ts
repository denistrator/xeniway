import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { en, type TranslationDictionary } from "./locales/en";

export const supportedLocales = ["en", "ru", "uk"] as const;
export type SupportedLocale = (typeof supportedLocales)[number];
export const languageStorageKey = "xeniway-language";

const localeLoaders: Record<Exclude<SupportedLocale, "en">, () => Promise<{ default: TranslationDictionary }>> = {
  ru: () => import("./locales/ru"),
  uk: () => import("./locales/uk"),
};

export function resolveLocale(storedLocale: string | null, browserLanguage?: string): SupportedLocale {
  if (supportedLocales.includes(storedLocale as SupportedLocale)) return storedLocale as SupportedLocale;

  const browserLocale = browserLanguage?.toLowerCase().split("-")[0];
  return supportedLocales.includes(browserLocale as SupportedLocale) ? (browserLocale as SupportedLocale) : "en";
}

async function ensureLocaleResources(locale: SupportedLocale) {
  if (i18n.hasResourceBundle(locale, "translation") || locale === "en") return;

  const resources = await localeLoaders[locale]();
  i18n.addResourceBundle(locale, "translation", resources.default, true, true);
}

export async function initializeI18n() {
  const locale = resolveLocale(window.localStorage.getItem(languageStorageKey), window.navigator.language);

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

  await ensureLocaleResources(locale);
  await i18n.changeLanguage(locale);
}

export async function changeLocale(locale: SupportedLocale) {
  await ensureLocaleResources(locale);
  await i18n.changeLanguage(locale);
  window.localStorage.setItem(languageStorageKey, locale);
}

export { i18n };
