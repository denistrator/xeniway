import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { CreateApplicationLoader } from "../features/applications/form/create-application-loader.view";
import { WelcomeModal } from "../features/welcome/welcome-modal.view";
import { DirtyEditorsProvider } from "../lib/dirty-editors";
import { DirtyDeparture } from "./dirty-departure.view";
import { useLayout, useWelcomeHost } from "./layout.model";
import { layoutStyles } from "./layout.styles";
import { LoadingScreen } from "./loading-screen.view";
import { SiteFooter } from "./site-footer.view";
import { SiteHeader } from "./site-header.view";

const styles = layoutStyles();

export function Layout() {
  const view = useLayout();
  return (
    <DirtyEditorsProvider>
      <div className={styles.root()}>
        <SiteHeader onCreateDialogOpen={view.handleCreateDialogOpen} />
        <main id="main-content" tabIndex={-1} className={styles.main()}>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </main>
        <CreateApplicationLoader openerRef={view.createOpenerRef} />
        <DirtyDeparture />
        <WelcomeHost />
        <SiteFooter />
      </div>
    </DirtyEditorsProvider>
  );
}

function WelcomeHost() {
  const view = useWelcomeHost();
  if (!view.visible) {
    return null;
  }
  return <WelcomeModal onComplete={view.handleComplete} />;
}
