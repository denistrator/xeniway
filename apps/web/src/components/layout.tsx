import { useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { CreateApplicationLoader } from "../features/applications/form/create-application-loader";
import { UserPreferencesSync } from "../features/preferences/user-preferences-sync";
import { type WelcomeAction, WelcomeModal } from "../features/welcome/welcome-modal";
import { useCompleteIntroduction, useCurrentUser, useUserPreferences } from "../lib/queries";
import { writeLocalUserPreferences } from "../lib/user-preferences";
import { closeWelcome, type RootState } from "../store";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function Layout() {
  const createOpenerRef = useRef<HTMLElement | null>(null);
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader
        onCreateDialogOpen={(opener) => {
          createOpenerRef.current = opener;
        }}
      />
      <UserPreferencesSync />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 py-8">
        <Outlet />
      </main>
      <CreateApplicationLoader openerRef={createOpenerRef} />
      <WelcomeHost />
      <SiteFooter />
    </div>
  );
}

function WelcomeHost() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector((state: RootState) => state.ui.welcome.open);
  const user = useCurrentUser();
  const preferences = useUserPreferences(open && user.data ? user.data.id : null);
  const completeIntroduction = useCompleteIntroduction();

  if (!open || preferences.isPending || preferences.error || preferences.data?.wasIntroduced !== false) return null;

  function handleComplete(action: WelcomeAction) {
    writeLocalUserPreferences({ wasIntroduced: true });
    dispatch(closeWelcome());
    if (action === "board") navigate("/", { replace: true });
    if (action === "about") navigate("/about");
    completeIntroduction.mutate();
  }

  return <WelcomeModal onComplete={handleComplete} />;
}
