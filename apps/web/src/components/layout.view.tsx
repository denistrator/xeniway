import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { CreateApplicationLoader } from "../features/applications/form/create-application-loader.view";
import { BackgroundPreferenceFeedbackContext } from "../features/preferences/preference-feedback.model";
import { WelcomeModal } from "../features/welcome/welcome-modal.view";
import { DirtyEditorsProvider } from "../lib/dirty-editors";
import { DirtyDeparture } from "./dirty-departure.view";
import { useLayout } from "./layout.model";
import { layoutStyles } from "./layout.styles";
import { LoadingScreen } from "./loading-screen.view";
import { SiteFooter } from "./site-footer.view";
import { SiteHeader } from "./site-header.view";

const styles = layoutStyles();

export function Layout() {
  const view = useLayout();
  return (
    <BackgroundPreferenceFeedbackContext.Provider value={view.backgroundPreferenceFeedbackActive}>
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
          {view.welcome.visible && <WelcomeModal onComplete={view.welcome.handleComplete} />}
          <SiteFooter />
        </div>
      </DirtyEditorsProvider>
    </BackgroundPreferenceFeedbackContext.Provider>
  );
}
