import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale, supportedLocales } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";

const options: Array<{ value: SupportedLocale; label: string; flag: string }> = [
  { value: "en", label: "EN", flag: "🇬🇧" },
  { value: "ru", label: "RU", flag: "🇷🇺" },
  { value: "uk", label: "UK", flag: "🇺🇦" },
  { value: "he", label: "HE", flag: "🇮🇱" },
];

export function LanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLocale = i18n.resolvedLanguage ?? "en";
  const currentOption = options.find((option) => option.value === currentLocale) ?? options[0];
  const user = useCurrentUser();
  const updatePreferences = useUpdateUserPreferences();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  async function handleChange(locale: SupportedLocale) {
    try {
      await changeLocale(locale);
      if (user.data) updatePreferences.mutate({ selectedLanguage: locale });
      setOpen(false);
    } catch {
      // Keep the current locale when a lazy dictionary cannot be loaded.
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        aria-label={`Language: ${t(`common.language.${currentOption.value}`)}. Change language`}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex h-9 min-w-9 items-center justify-center rounded-xl border border-line bg-surface px-2.5 text-xs font-semibold text-ink transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        onClick={() => setOpen((value) => !value)}
        type="button"
      >
        {currentOption.label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute end-0 top-full z-30 mt-2 min-w-48 rounded-xl border border-line bg-surface p-2 shadow-lg"
        >
          {supportedLocales.map((locale) => {
            const option = options.find((candidate) => candidate.value === locale);
            if (!option) return null;
            return (
              <button
                key={locale}
                role="menuitem"
                type="button"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start text-sm text-ink hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                onClick={() => void handleChange(locale)}
              >
                <span aria-hidden="true">{option.flag}</span>
                <span>{t(`common.language.${locale}`)}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
