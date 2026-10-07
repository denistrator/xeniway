import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { CreateApplicationLoader } from "../features/applications/form/create-application-loader.tsx";
import { OfflineControls } from "../features/offline/offline-controls.tsx";
import { UserPreferencesSync } from "../features/preferences/user-preferences-sync.tsx";
import { WelcomeModal } from "../features/welcome/welcome-modal.tsx";
import { layoutStyles } from "./layout.styles.ts";
import { useLayout, useWelcomeHost } from "./layout.ts";
import { LoadingScreen } from "./loading-screen.tsx";
import { SiteFooter } from "./site-footer.tsx";
import { SiteHeader } from "./site-header.tsx";

const styles = layoutStyles();

export function Layout() {
  const view = useLayout();
  return (
    <div className={styles.root()}>
      <SiteHeader onCreateDialogOpen={view.handleCreateDialogOpen} />
      <UserPreferencesSync />
      <OfflineControls />
      <main id="main-content" tabIndex={-1} className={styles.main()}>
        <Suspense fallback={<LoadingScreen />}>
          <Outlet />
        </Suspense>
      </main>
      <CreateApplicationLoader openerRef={view.createOpenerRef} />
      <WelcomeHost />
      <SiteFooter />
    </div>
  );
}

function WelcomeHost() {
  const view = useWelcomeHost();
  if (!view.visible) {
    return null;
  }
  return <WelcomeModal onComplete={view.handleComplete} />;
}
