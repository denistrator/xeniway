import { useEffect } from "react";
import { useTranslation } from "react-i18next";

export function useLanguageSync() {
  const { i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.lang = i18n.resolvedLanguage ?? "en";
  }, [i18n.resolvedLanguage]);
}
