import { useTranslation } from "react-i18next";
import { useThemeSync } from "./features/preferences/theme-sync.model";

export function useApp() {
  useThemeSync();
  const { t } = useTranslation();
  return {
    skipToMainContent: t("accessibility.skipToMainContent"),
  };
}
