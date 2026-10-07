import { useTranslation } from "react-i18next";

export function useApp() {
  const { t } = useTranslation();
  return {
    skipToMainContent: t("accessibility.skipToMainContent"),
  };
}
