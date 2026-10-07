import { useTranslation } from "react-i18next";

export function useNotFoundPage() {
  const { t } = useTranslation();
  return {
    title: t("notFound.title"),
    description: t("notFound.description"),
    navigationLabel: t("notFound.navigationLabel"),
    goToApplications: t("notFound.goToApplications"),
    about: t("notFound.about"),
  };
}
