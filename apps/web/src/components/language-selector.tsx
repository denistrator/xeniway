import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale } from "../i18n/i18n";
import { cn } from "../lib/utils";

const options: Array<{ value: SupportedLocale; label: string; accessibleLabel: string }> = [
  { value: "en", label: "EN", accessibleLabel: "English" },
  { value: "ru", label: "RU", accessibleLabel: "Русский" },
  { value: "uk", label: "UK", accessibleLabel: "Українська" },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.resolvedLanguage ?? "en";

  async function handleChange(locale: SupportedLocale) {
    try {
      await changeLocale(locale);
    } catch {
      // Keep the current locale when a lazy dictionary cannot be loaded.
    }
  }

  return (
    <fieldset className="flex items-center gap-1 rounded-xl border border-line bg-surface p-1">
      <legend className="sr-only">{t("common.language.label")}</legend>
      {options.map((option) => {
        const isActive = option.value === currentLocale;

        return (
          <button
            aria-label={option.accessibleLabel}
            aria-pressed={isActive}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              isActive ? "bg-accent-soft text-accent" : "text-muted hover:bg-accent-hover hover:text-ink",
            )}
            key={option.value}
            onClick={() => void handleChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        );
      })}
    </fieldset>
  );
}
