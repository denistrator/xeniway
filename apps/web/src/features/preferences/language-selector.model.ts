import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { changeLocale, type SupportedLocale, supportedLocales } from "../../i18n/i18n";
import { useCurrentUser, useUpdateUserPreferences } from "../../lib/queries";
import { useCanMutate } from "../offline/offline-access.model";

export type LanguageSelectorProps = {
  showFeedback?: boolean;
  menuPlacement?: "default" | "contained";
};

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
    const sameOwner = updatePreferences.captureOwner();
    try {
      const applied = await changeLocale(locale, { shouldApply: sameOwner });
      if (!applied || !sameOwner()) {
        return false;
      }
      if (user.data && canMutate) {
        updatePreferences.mutate({ selectedLanguage: locale });
      } else {
        updatePreferences.keepLocal({ selectedLanguage: locale });
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
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef(new Map<SupportedLocale, HTMLButtonElement>());

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

  useEffect(() => {
    if (!open) {
      return;
    }
    optionRefs.current.get(currentOption.value)?.focus();
  }, [currentOption.value, open]);

  function closeMenu(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) {
      queueMicrotask(() => triggerRef.current?.focus());
    }
  }

  async function handleChange(locale: SupportedLocale) {
    await selectLanguage(locale);
    closeMenu(true);
  }

  function toggleOpen() {
    if (open) {
      closeMenu(false);
      return;
    }
    setOpen(true);
  }

  function setOptionRef(locale: SupportedLocale, element: HTMLButtonElement | null) {
    if (element) {
      optionRefs.current.set(locale, element);
      return;
    }
    optionRefs.current.delete(locale);
  }

  function handleMenuKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const currentIndex = supportedLocales.indexOf(currentOption.value);
    const target = event.target;
    const focusedLocale =
      target instanceof HTMLButtonElement
        ? supportedLocales.find((locale) => optionRefs.current.get(locale) === target)
        : undefined;
    const focusedIndex = focusedLocale ? supportedLocales.indexOf(focusedLocale) : currentIndex;

    let nextIndex = focusedIndex;
    switch (event.key) {
      case "ArrowDown": {
        nextIndex = (focusedIndex + 1) % supportedLocales.length;
        break;
      }
      case "ArrowUp": {
        nextIndex = (focusedIndex - 1 + supportedLocales.length) % supportedLocales.length;
        break;
      }
      case "Home": {
        nextIndex = 0;
        break;
      }
      case "End": {
        nextIndex = supportedLocales.length - 1;
        break;
      }
      case "Escape": {
        event.preventDefault();
        event.stopPropagation();
        closeMenu(true);
        return;
      }
      default: {
        return;
      }
    }

    event.preventDefault();
    optionRefs.current.get(supportedLocales[nextIndex])?.focus();
  }

  const label = t("common.selectors.language", { language: t(`common.language.${currentOption.value}`) });
  const menuOptions = supportedLocales.flatMap((locale) => {
    const option = languageOptions.find((candidate) => candidate.value === locale);
    if (!option) {
      return [];
    }
    return [
      {
        ...option,
        current: locale === currentOption.value,
        translatedLabel: t(`common.language.${locale}`),
        onSelect: () => void handleChange(locale),
        setRef: (element: HTMLButtonElement | null) => setOptionRef(locale, element),
      },
    ];
  });
  return {
    open,
    containerRef,
    triggerRef,
    currentOption,
    label,
    toggleOpen,
    handleMenuKeyDown,
    menuOptions,
  };
}
