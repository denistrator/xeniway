import { useTranslation } from "react-i18next";
import { AppRoutes } from "./app-routes";
import { AuthFailureHandler } from "./components/auth-failure-handler";
import { LanguageSync } from "./components/language-sync";
import { ThemeSync } from "./components/theme-sync";

export { AuthFailureHandler } from "./components/auth-failure-handler";

export function App() {
  const { t } = useTranslation();
  return (
    <>
      <a
        href="#main-content"
        className="skip-link fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-canvas shadow-lg transition-transform focus:translate-y-0"
      >
        {t("accessibility.skipToMainContent")}
      </a>
      <ThemeSync />
      <LanguageSync />
      <AuthFailureHandler />
      <AppRoutes />
    </>
  );
}
