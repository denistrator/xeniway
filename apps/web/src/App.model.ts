import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { applicationKeys, userPreferencesKeys } from "./lib/api";
import { authKeys } from "./lib/queries";
import { writeLocalUserPreferences } from "./lib/user-preferences";
import type { RootState } from "./store";

export function useApp() {
  useThemeSync();
  useAuthFailureHandler();
  const { t } = useTranslation();
  return {
    skipToMainContent: t("accessibility.skipToMainContent"),
  };
}

function useThemeSync() {
  const preference = useSelector((state: RootState) => state.ui.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = preference === "dark" || (preference === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#020618" : "#f5f3ee");
      document.documentElement.style.removeProperty("background-color");
    };
    apply();
    media.addEventListener("change", apply);
    writeLocalUserPreferences({ theme: preference });
    return () => media.removeEventListener("change", apply);
  }, [preference]);
}

function useAuthFailureHandler() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handleAuthExpired = () => {
      queryClient.removeQueries({ queryKey: authKeys.me });
      queryClient.removeQueries({ queryKey: authKeys.csrf });
      queryClient.removeQueries({ queryKey: applicationKeys.all });
      queryClient.removeQueries({ queryKey: userPreferencesKeys.all });
    };
    window.addEventListener("xeniway:auth-expired", handleAuthExpired);
    return () => window.removeEventListener("xeniway:auth-expired", handleAuthExpired);
  }, [queryClient]);
}
