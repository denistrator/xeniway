import { useEffect } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";

export function ThemeSync() {
  const preference = useSelector((state: RootState) => state.ui.theme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const dark = preference === "dark" || (preference === "system" && media.matches);
      document.documentElement.dataset.theme = dark ? "dark" : "light";
      document.documentElement.style.colorScheme = dark ? "dark" : "light";
      document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#020617" : "#f8fafc");
      document.documentElement.style.removeProperty("background-color");
    };
    apply();
    media.addEventListener("change", apply);
    localStorage.setItem("job-tracker-theme", preference);
    return () => media.removeEventListener("change", apply);
  }, [preference]);

  return null;
}
