import { Outlet } from "react-router-dom";
import { JobManagerHost } from "./job-manager-host";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 py-8">
        <Outlet />
      </main>
      <JobManagerHost />
      <SiteFooter />
    </div>
  );
}
