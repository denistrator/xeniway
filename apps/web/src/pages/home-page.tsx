import type { CreateApplicationInput, JobStatus } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { JobBoard } from "../components/job-board";
import { JobManager } from "../components/job-manager";
import { StatusFilter } from "../components/status-filter";
import { Button } from "../components/ui/button";
import { useApplicationMutations, useApplications } from "../lib/queries";
import { closeDrawer, type RootState, setSearch } from "../store";

export function HomePage() {
  const dispatch = useDispatch();
  const drawer = useSelector((state: RootState) => state.ui.drawer);
  const filters = useSelector((state: RootState) => state.ui);
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const selectedJob = applications.data?.find((job) => job.id === drawer.jobId);
  const pending = mutations.create.isPending || mutations.update.isPending;

  async function handleSave(input: CreateApplicationInput) {
    if (drawer.mode === "create") await mutations.create.mutateAsync(input);
    else if (drawer.jobId !== null) await mutations.update.mutateAsync({ id: drawer.jobId, input });
    dispatch(closeDrawer());
  }

  async function handleStatusChange(id: number, status: JobStatus) {
    await mutations.update.mutateAsync({ id, input: { status } });
  }

  async function handleReorder(status: JobStatus, applicationIds: number[]) {
    await mutations.reorder.mutateAsync({ status, applicationIds });
  }

  async function handleArchive() {
    if (drawer.jobId !== null) {
      await mutations.archive.mutateAsync(drawer.jobId);
      dispatch(closeDrawer());
    }
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6 px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Your search, organized</p>
            <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink">Applications</h1>
            <p className="mt-2 text-muted">Track every conversation from first contact to outcome.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <input
            aria-label="Search applications"
            name="search"
            autoComplete="off"
            className="h-10 min-w-64 flex-1 rounded-xl border border-line bg-canvas px-3 text-sm text-ink outline-none focus:border-accent"
            placeholder="Search company, position, location…"
            value={filters.search}
            onChange={(event) => dispatch(setSearch(event.target.value))}
          />
          <StatusFilter />
          <Button variant="outline" onClick={() => dispatch(setSearch(""))}>
            Clear search
          </Button>
        </div>
        {applications.isPending && (
          <p role="status" aria-live="polite" className="py-8 text-center text-sm text-muted">
            Loading applications…
          </p>
        )}
        {applications.error && (
          <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            Unable to load applications: {applications.error.message}
          </p>
        )}
        {applications.data && !applications.data.length && (
          <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-muted">
            No applications yet. Add your first opportunity to get started.
          </p>
        )}
      </div>
      {applications.data && applications.data.length > 0 && (
        <JobBoard jobs={applications.data} onStatusChange={handleStatusChange} onReorder={handleReorder} />
      )}
      <div className="mx-auto max-w-7xl px-6">
        <JobManager
          job={selectedJob}
          submitting={pending}
          onSave={handleSave}
          onArchive={handleArchive}
          onClose={() => dispatch(closeDrawer())}
        />
        {(mutations.create.error || mutations.update.error || mutations.archive.error) && (
          <p className="text-sm text-rose-600 dark:text-rose-400">
            {(mutations.create.error || mutations.update.error || mutations.archive.error)?.message}
          </p>
        )}
      </div>
    </div>
  );
}
