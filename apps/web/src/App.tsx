import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";
import { Layout } from "./components/layout";
import { ThemeSync } from "./components/theme-sync";
import { applicationKeys } from "./lib/api";
import { authKeys, useCurrentUser } from "./lib/queries";
import { AboutPage } from "./pages/about-page";
import { ArchivePage } from "./pages/archive-page";
import { HomePage } from "./pages/home-page";
import { LoginPage } from "./pages/login-page";
import { RegisterPage } from "./pages/register-page";

export function App() {
  return (
    <>
      <a
        href="#main-content"
        className="skip-link fixed left-4 top-4 z-[100] -translate-y-24 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 dark:bg-white dark:text-slate-950"
      >
        Skip to main content
      </a>
      <ThemeSync />
      <AuthFailureHandler />
      <Routes>
        <Route path="/about" element={<AboutPage />} />
        <Route element={<RequireAuth />}>
          <Route element={<Layout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/archive" element={<ArchivePage />} />
          </Route>
        </Route>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
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
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500 dark:bg-slate-950 dark:text-slate-400">
      Loading…
    </div>
  );
}
