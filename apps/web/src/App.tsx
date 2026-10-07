import { appStyles } from "./App.styles.ts";
import { useApp } from "./App.ts";
import { AppRoutes } from "./app-routes.tsx";
import { AuthFailureHandler } from "./components/auth-failure-handler.tsx";
import { LanguageSync } from "./features/preferences/language-sync.tsx";
import { ThemeSync } from "./features/preferences/theme-sync.tsx";

export { AuthFailureHandler } from "./components/auth-failure-handler.tsx";

const styles = appStyles();

export function App() {
  const view = useApp();
  return (
    <>
      <a href="#main-content" className={styles.skipLink()}>
        {view.skipToMainContent}
      </a>
      <ThemeSync />
      <LanguageSync />
      <AuthFailureHandler />
      <AppRoutes />
    </>
  );
}
