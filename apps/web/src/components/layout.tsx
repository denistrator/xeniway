import type { CreateApplicationInput } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { Outlet } from "react-router-dom";
import { useApplicationMutations, useApplications, useCurrentUser } from "../lib/queries";
import { closeDrawer, type RootState } from "../store";
import { JobManager } from "./job-manager";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className="w-full flex-1 py-8">
        <Outlet />
      </main>
      <AuthenticatedJobManager />
      <SiteFooter />
    </div>
  );
}

function AuthenticatedJobManager() {
  const user = useCurrentUser();

  return user.data ? <JobManagerHost /> : null;
}

function JobManagerHost() {
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const selectedJob = applications.data?.find((job) => job.id === drawer.jobId);
  const pending = mutations.create.isPending || mutations.update.isPending;

  async function handleSave(input: CreateApplicationInput) {
    if (drawer.mode === "create") await mutations.create.mutateAsync(input);
    else if (drawer.jobId !== null) await mutations.update.mutateAsync({ id: drawer.jobId, input });
    dispatch(closeDrawer());
  }

  async function handleArchive() {
    if (drawer.jobId !== null) {
      await mutations.archive.mutateAsync(drawer.jobId);
      dispatch(closeDrawer());
    }
  }

  return (
    <>
      <JobManager
        job={selectedJob}
        submitting={pending}
        onSave={handleSave}
        onArchive={handleArchive}
        onClose={() => dispatch(closeDrawer())}
      />
      {(mutations.create.error || mutations.update.error || mutations.archive.error) && (
        <p className="mx-auto max-w-7xl px-6 pb-6 text-sm text-rose-600 dark:text-rose-400">
          {(mutations.create.error || mutations.update.error || mutations.archive.error)?.message}
        </p>
      )}
    </>
  );
}
