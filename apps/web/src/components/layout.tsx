import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

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
      <SiteFooter />
    </div>
  );
}
