import { useTranslation } from "react-i18next";

export function useAboutHero() {
  const { t } = useTranslation();
  return {
    heroTitle: t("about.heroTitle"),
    heroDescription: t("about.heroDescription"),
  };
}
