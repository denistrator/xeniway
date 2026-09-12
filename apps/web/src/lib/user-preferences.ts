import {
  type FormPresentation,
  formPresentationSchema,
  type SupportedLocale,
  supportedLocaleSchema,
  type ThemePreference,
  themePreferenceSchema,
} from "@xeniway/shared";

export const userPreferencesStorageKey = "userPreferences";

export type LocalUserPreferences = {
  theme: ThemePreference;
  language: SupportedLocale;
  formPresentation: FormPresentation;
  wasIntroduced: boolean;
};

type LocalUserPreferencesUpdate = Partial<LocalUserPreferences>;

const defaultPreferences: LocalUserPreferences = {
  theme: "system",
  language: "en",
  formPresentation: "drawer",
  wasIntroduced: false,
};

function getStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getDefaultLanguage(): SupportedLocale {
  if (typeof window === "undefined") return defaultPreferences.language;

  const browserLanguage = window.navigator.language?.toLowerCase().split("-")[0];
  return supportedLocaleSchema.safeParse(browserLanguage).success
    ? (browserLanguage as SupportedLocale)
    : defaultPreferences.language;
}

function getDefaults(): LocalUserPreferences {
  return { ...defaultPreferences, language: getDefaultLanguage() };
}

function parsePreferences(value: unknown, defaults: LocalUserPreferences): LocalUserPreferences {
  if (!value || typeof value !== "object") return { ...defaults };

  const candidate = value as Record<string, unknown>;
  const theme = themePreferenceSchema.safeParse(candidate.theme);
  const language = supportedLocaleSchema.safeParse(candidate.language);
  const formPresentation = formPresentationSchema.safeParse(candidate.formPresentation);

  return {
    theme: theme.success ? theme.data : defaults.theme,
    language: language.success ? language.data : defaults.language,
    formPresentation: formPresentation.success ? formPresentation.data : defaults.formPresentation,
    wasIntroduced: typeof candidate.wasIntroduced === "boolean" ? candidate.wasIntroduced : defaults.wasIntroduced,
  };
}

function readStoredPreferences(storage: Storage, defaults: LocalUserPreferences): LocalUserPreferences {
  try {
    const raw = storage.getItem(userPreferencesStorageKey);
    return raw ? parsePreferences(JSON.parse(raw), defaults) : { ...defaults };
  } catch {
    return { ...defaults };
  }
}

function persistPreferences(storage: Storage, preferences: LocalUserPreferences): boolean {
  try {
    storage.setItem(userPreferencesStorageKey, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}

export function readLocalUserPreferences(): LocalUserPreferences {
  const defaults = getDefaults();
  const storage = getStorage();
  return storage ? readStoredPreferences(storage, defaults) : defaults;
}

export function writeLocalUserPreferences(partial: LocalUserPreferencesUpdate): LocalUserPreferences {
  const current = readLocalUserPreferences();
  const next = parsePreferences({ ...current, ...partial }, current);
  const storage = getStorage();
  if (storage) persistPreferences(storage, next);
  return next;
}
