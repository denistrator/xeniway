import type { CreateApplicationInput, JobStatus } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { JobBoard } from "../components/job-board";
import { JobDrawer } from "../components/job-drawer";
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
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">Your search, organized</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Applications</h1>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Track every conversation from first contact to outcome.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <input
            aria-label="Search applications"
            className="h-10 min-w-64 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
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
          <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading applications…</p>
        )}
        {applications.error && (
          <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            Unable to load applications: {applications.error.message}
          </p>
        )}
        {applications.data && !applications.data.length && (
          <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No applications yet. Add your first opportunity to get started.
          </p>
        )}
      </div>
      {applications.data && applications.data.length > 0 && (
        <JobBoard jobs={applications.data} onStatusChange={handleStatusChange} />
      )}
      <div className="mx-auto max-w-7xl px-6">
        <JobDrawer
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
