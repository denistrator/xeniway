import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { LanguageSync } from "./components/language-sync";
import { Layout } from "./components/layout";
import { ThemeSync } from "./components/theme-sync";
import { applicationKeys } from "./lib/api";
import { authKeys, useCurrentUser } from "./lib/queries";
import { AboutPage } from "./pages/about-page";
import { ArchivePage } from "./pages/archive-page";
import { BlacklistPage } from "./pages/blacklist-page";
import { ForgotPasswordPage } from "./pages/forgot-password-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { NotFoundPage } from "./pages/not-found-page";
import { PasswordResetPage } from "./pages/password-reset-page";
import { RegisterPage } from "./pages/register-page";

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
      <Routes>
        <Route element={<Layout />}>
          <Route path="/about" element={<AboutPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/archive" element={<ArchivePage />} />
            <Route path="/blacklist" element={<BlacklistPage />} />
          </Route>
          <Route element={<GuestOnly />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
          </Route>
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<PasswordResetPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </>
  );
}

function AuthFailureHandler() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      queryClient.removeQueries({ queryKey: authKeys.csrf });
      queryClient.removeQueries({ queryKey: applicationKeys.all });
    };
    window.addEventListener("job-tracker:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("job-tracker:auth-expired", handleAuthExpired);
  }, [queryClient]);

  return null;
}

function RequireAuth() {
  const user = useCurrentUser();
  if (user.isPending) return <LoadingScreen />;
  return user.data ? <Outlet /> : <Navigate to="/login" replace />;
}

function GuestOnly() {
  const user = useCurrentUser();
  if (user.isPending) return <LoadingScreen />;
  return user.data ? <Navigate to="/" replace /> : <Outlet />;
}

function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas text-sm leading-6 text-muted">
      {t("common.loading")}
    </div>
  );
}
