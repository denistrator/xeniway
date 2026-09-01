import type { CreateApplicationInput, JobStatus } from "@job-tracker/shared";
import { useDispatch, useSelector } from "react-redux";
import { JobBoard } from "../components/job-board";
import { JobDrawer } from "../components/job-drawer";
import { Button } from "../components/ui/button";
import { useApplicationMutations, useApplications } from "../lib/queries";
import { closeDrawer, type RootState, setSearch, setSort, setStatusFilter } from "../store";

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
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-sky-600">Your search, organized</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Applications</h1>
          <p className="mt-2 text-slate-500">Track every conversation from first contact to outcome.</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input
          aria-label="Search applications"
          className="h-10 min-w-64 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-500"
          placeholder="Search company, position, location…"
          value={filters.search}
          onChange={(event) => dispatch(setSearch(event.target.value))}
        />
        <select
          aria-label="Filter status"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          value={filters.statusFilter}
          onChange={(event) => dispatch(setStatusFilter(event.target.value as RootState["ui"]["statusFilter"]))}
        >
          <option value="all">All statuses</option>
          {["saved", "applied", "interview", "offer", "rejected", "withdrawn"].map((status) => (
            <option key={status} value={status}>
              {status[0].toUpperCase() + status.slice(1)}
            </option>
          ))}
        </select>
        <select
          aria-label="Sort applications"
          className="h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm"
          value={`${filters.sortField}-${filters.sortDirection}`}
          onChange={(event) => {
            const [field, direction] = event.target.value.split("-") as [
              RootState["ui"]["sortField"],
              RootState["ui"]["sortDirection"],
            ];
            dispatch(setSort({ field, direction }));
          }}
        >
          <option value="createdAt-desc">Newest first</option>
          <option value="createdAt-asc">Oldest first</option>
          <option value="appliedAt-desc">Applied date, newest</option>
          <option value="appliedAt-asc">Applied date, oldest</option>
        </select>
        <Button variant="outline" onClick={() => dispatch(setSearch(""))}>
          Clear search
        </Button>
      </div>
      {applications.isPending && <p className="py-8 text-center text-sm text-slate-500">Loading applications…</p>}
      {applications.error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700">
          Unable to load applications: {applications.error.message}
        </p>
      )}
      {applications.data && !applications.data.length && (
        <p className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-sm text-slate-500">
          No applications yet. Add your first opportunity to get started.
        </p>
      )}
      {applications.data && applications.data.length > 0 && (
        <JobBoard jobs={applications.data} onStatusChange={handleStatusChange} />
      )}
      <JobDrawer
        job={selectedJob}
        submitting={pending}
        onSave={handleSave}
        onArchive={handleArchive}
        onClose={() => dispatch(closeDrawer())}
      />
      {(mutations.create.error || mutations.update.error || mutations.archive.error) && (
        <p className="text-sm text-rose-600">
          {(mutations.create.error || mutations.update.error || mutations.archive.error)?.message}
        </p>
      )}
    </div>
  );
}
