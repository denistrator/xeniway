import type { SupportedLocale } from "@xeniway/shared";
import { en, type TranslationDictionary } from "./locales/en";
import heUrl from "./locales/he.json?url&no-inline";
import ruUrl from "./locales/ru.json?url&no-inline";
import ukUrl from "./locales/uk.json?url&no-inline";

type LazyLocale = Exclude<SupportedLocale, "en">;
type DictionaryNode = string | { readonly [key: string]: DictionaryNode };
const dictionaryUrls: Record<LazyLocale, string> = { he: heUrl, ru: ruUrl, uk: ukUrl };
const pendingDictionaries = new Map<LazyLocale, Promise<TranslationDictionary>>();

function matchesDictionary(value: unknown, reference: DictionaryNode): boolean {
  if (typeof reference === "string") {
    return typeof value === "string";
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const fields = value as Record<string, unknown>;
  const entries = Object.entries(reference);
  if (Object.keys(fields).length !== entries.length) {
    return false;
  }
  return entries.every(([key, child]) => Object.hasOwn(fields, key) && matchesDictionary(fields[key], child));
}

async function downloadDictionary(locale: LazyLocale): Promise<TranslationDictionary> {
  const url = new URL(dictionaryUrls[locale], window.location.origin);
  if (url.origin !== window.location.origin) {
    throw new Error("The language resource URL is invalid");
  }
  const response = await fetch(url.href, {
    mode: "same-origin",
    credentials: "omit",
    redirect: "error",
    cache: "no-cache",
    headers: { Accept: "application/json" },
  });
  const contentType = response.headers.get("content-type")?.split(";")[0].trim();
  const isValidResponse = response.ok && !response.redirected && contentType === "application/json";
  if (!isValidResponse) {
    throw new Error("The language resource response is invalid");
  }
  const value: unknown = await response.json();
  if (!matchesDictionary(value, en)) {
    throw new Error("The language resource structure is invalid");
  }
  return value as TranslationDictionary;
}

export function fetchDictionary(locale: LazyLocale): Promise<TranslationDictionary> {
  const pending = pendingDictionaries.get(locale);
  if (pending) {
    return pending;
  }
  // Public resources can be shared; activation and ownership remain request-scoped.
  const download = downloadDictionary(locale).finally(() => {
    pendingDictionaries.delete(locale);
  });
  pendingDictionaries.set(locale, download);
  return download;
}
