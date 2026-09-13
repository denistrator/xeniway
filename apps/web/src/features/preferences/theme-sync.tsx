import { useEffect } from "react";
import { useSelector } from "react-redux";
import { writeLocalUserPreferences } from "../../lib/user-preferences";
import type { RootState } from "../../store";

export function ThemeSync() {
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

  return null;
}
