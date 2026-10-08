import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale, supportedLocales } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { useCanMutate } from "../offline/offline-access.model";

export const languageOptions: { value: SupportedLocale; label: string; flag: string }[] = [
  { value: "en", label: "EN", flag: "🇬🇧" },
  { value: "ru", label: "RU", flag: "🇷🇺" },
  { value: "uk", label: "UK", flag: "🇺🇦" },
  { value: "he", label: "HE", flag: "🇮🇱" },
];

export function useLanguagePreference() {
  const { i18n, t } = useTranslation();
  const currentLocale = i18n.resolvedLanguage ?? "en";
  const currentOption = languageOptions.find((option) => option.value === currentLocale) ?? languageOptions[0];
  const user = useCurrentUser();
  const canMutate = useCanMutate();
  const updatePreferences = useUpdateUserPreferences();

  async function selectLanguage(locale: SupportedLocale) {
    try {
      await changeLocale(locale);
      if (user.data && canMutate) {
        updatePreferences.mutate({ selectedLanguage: locale });
      }
      return true;
    } catch {
      // Keep the current locale when a lazy dictionary cannot be loaded.
      return false;
    }
  }
  return { currentOption, selectLanguage, t };
}

export function useLanguageSelector() {
  const { currentOption, selectLanguage, t } = useLanguagePreference();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (await selectLanguage(locale)) {
      setOpen(false);
    }
  }

  const toggleOpen = () => setOpen((value) => !value);
  const label = t("common.selectors.language", { language: t(`common.language.${currentOption.value}`) });
  const menuOptions = supportedLocales.flatMap((locale) => {
    const option = languageOptions.find((candidate) => candidate.value === locale);
    if (!option) {
      return [];
    }
    return [{ ...option, translatedLabel: t(`common.language.${locale}`), onSelect: () => void handleChange(locale) }];
  });
  return { open, containerRef, currentOption, label, toggleOpen, menuOptions };
}
