import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";

const options: Array<{ value: SupportedLocale; label: string; accessibleLabel: string }> = [
  { value: "en", label: "EN", accessibleLabel: "English" },
  { value: "ru", label: "RU", accessibleLabel: "Русский" },
  { value: "uk", label: "UK", accessibleLabel: "Українська" },
];

export function nextLocale(locale: SupportedLocale): SupportedLocale {
  const currentIndex = options.findIndex((option) => option.value === locale);
  return options[(currentIndex + 1) % options.length].value;
}

export function LanguageSelector() {
  const { i18n } = useTranslation();
  const currentLocale = i18n.resolvedLanguage ?? "en";
  const currentOption = options.find((option) => option.value === currentLocale) ?? options[0];
  const user = useCurrentUser();
  const updatePreferences = useUpdateUserPreferences();

  async function handleChange(locale: SupportedLocale) {
    try {
      await changeLocale(locale);
      if (user.data) updatePreferences.mutate({ selectedLanguage: locale });
    } catch {
      // Keep the current locale when a lazy dictionary cannot be loaded.
    }
  }

  return (
    <button
      aria-label={`Language: ${currentOption.accessibleLabel}. Change language`}
      className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      onClick={() => void handleChange(nextLocale(currentOption.value))}
      type="button"
    >
      {currentOption.label}
    </button>
  );
}
