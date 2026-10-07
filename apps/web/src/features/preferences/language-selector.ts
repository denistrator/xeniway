import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale, supportedLocales } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { useCanMutate } from "../offline/offline-access.ts";

const options: { value: SupportedLocale; label: string; flag: string }[] = [
  { value: "en", label: "EN", flag: "🇬🇧" },
  { value: "ru", label: "RU", flag: "🇷🇺" },
  { value: "uk", label: "UK", flag: "🇺🇦" },
  { value: "he", label: "HE", flag: "🇮🇱" },
];

export function useLanguageSelector() {
  const { i18n, t } = useTranslation();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentLocale = i18n.resolvedLanguage ?? "en";
  const currentOption = options.find((option) => option.value === currentLocale) ?? options[0];
  const user = useCurrentUser();
  const canMutate = useCanMutate();
  const updatePreferences = useUpdateUserPreferences();

  useEffect(() => {
    if (!open) {
      return;
    }
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  async function handleChange(locale: SupportedLocale) {
    try {
      await changeLocale(locale);
      if (user.data && canMutate) {
        updatePreferences.mutate({ selectedLanguage: locale });
      }
      setOpen(false);
    } catch {
      // Keep the current locale when a lazy dictionary cannot be loaded.
    }
  }

  const toggleOpen = () => setOpen((value) => !value);
  const label = `Language: ${t(`common.language.${currentOption.value}`)}. Change language`;
  const menuOptions = supportedLocales.flatMap((locale) => {
    const option = options.find((candidate) => candidate.value === locale);
    if (!option) {
      return [];
    }
    return [{ ...option, translatedLabel: t(`common.language.${locale}`), onSelect: () => void handleChange(locale) }];
  });
  return { open, containerRef, currentOption, label, toggleOpen, menuOptions };
}
