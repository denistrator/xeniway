import type { JobStatus } from "@job-tracker/shared";
import { ApplicationSearch } from "../components/application-search";
import { JobBoard } from "../components/job/job-board";
import { PageIntro } from "../components/page-intro";
import { StatusFilter } from "../components/status-filter";
import { useApplicationMutations, useApplications } from "../lib/queries";

export function HomePage() {
  const applications = useApplications();
  const mutations = useApplicationMutations();
  async function handleStatusChange(id: number, status: JobStatus) {
    await mutations.update.mutateAsync({ id, input: { status } });
  }

  async function handleReorder(status: JobStatus, applicationIds: number[]) {
    await mutations.reorder.mutateAsync({ status, applicationIds });
  }

  return (
    <div className="space-y-6">
      <div className="mx-auto max-w-7xl space-y-6 px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <PageIntro title="Applications" description="Track every conversation from first contact to outcome." />
        </div>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
          <ApplicationSearch />
          <StatusFilter />
        </div>
        {applications.isPending && (
          <p role="status" aria-live="polite" className="py-8 text-center text-sm leading-6 text-muted">
            Loading applications…
          </p>
        )}
        {applications.error && (
          <p className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
            Unable to load applications: {applications.error.message}
          </p>
        )}
        {applications.data && !applications.data.length && (
          <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
            No applications yet. Add your first opportunity to get started.
          </p>
        )}
      </div>
      {applications.data && applications.data.length > 0 && (
        <JobBoard jobs={applications.data} onStatusChange={handleStatusChange} onReorder={handleReorder} />
      )}
    </div>
  );
}
