import { lazy, Suspense } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Outlet, useNavigate } from "react-router-dom";
import { useCompleteIntroduction, useUserPreferences } from "../lib/queries";
import { closeWelcome, type RootState } from "../store";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";
import { type WelcomeAction, WelcomeModal } from "./welcome-modal";

const JobManagerHost = lazy(() =>
  import("./job/job-manager-host").then(({ JobManagerHost }) => ({ default: JobManagerHost })),
);

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 py-8">
        <Outlet />
      </main>
      <Suspense fallback={null}>
        <JobManagerHost />
      </Suspense>
      <WelcomeHost />
      <SiteFooter />
    </div>
  );
}

function WelcomeHost() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const open = useSelector((state: RootState) => state.ui.welcome.open);
  const preferences = useUserPreferences(open);
  const completeIntroduction = useCompleteIntroduction();

  if (!open || preferences.isPending || preferences.error || preferences.data?.wasIntroduced !== false) return null;

  async function handleComplete(action: WelcomeAction) {
    await completeIntroduction.mutateAsync();
    dispatch(closeWelcome());
    if (action === "board") navigate("/", { replace: true });
    if (action === "about") navigate("/about");
  }

  return <WelcomeModal onComplete={handleComplete} submitting={completeIntroduction.isPending} />;
}
