import { useTranslation } from "react-i18next";

export function useLoadingScreen() {
  const { t } = useTranslation();
  return {
    loading: t("common.loading"),
  };
}
