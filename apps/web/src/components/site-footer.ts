import { useTranslation } from "react-i18next";

export function useSiteFooter() {
  const { t } = useTranslation();
  return {
    description: t("footer.description", { year: new Date().getFullYear() }),
  };
}
