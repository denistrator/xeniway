import { useApp } from "./App.model";
import { appStyles } from "./App.styles";
import { AppRoutes } from "./app-routes.view";
import { AuthFailureHandler } from "./components/auth-failure-handler.view";
import { LanguageSync } from "./features/preferences/language-sync.view";
import { ThemeSync } from "./features/preferences/theme-sync.view";

export { AuthFailureHandler } from "./components/auth-failure-handler.view";

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
