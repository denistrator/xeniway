import { useTranslation } from "react-i18next";

export function LoadingScreen() {
  const { t } = useTranslation();
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm leading-6 text-muted">
      {t("common.loading")}
    </div>
  );
}
