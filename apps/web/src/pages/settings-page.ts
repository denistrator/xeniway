import { useTranslation } from "react-i18next";

export function useSettingsPage() {
  const { t } = useTranslation();
  return { title: t("navigation.settings") };
}
