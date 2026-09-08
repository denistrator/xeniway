import type { JobApplication } from "@job-tracker/shared";
import { useMemo } from "react";
import { useSelector } from "react-redux";
import { ApplicationSearch } from "../components/application-search";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { matchesApplicationSearch } from "../lib/application-filters";
import { useApplicationMutations, useArchivedApplications } from "../lib/queries";
import type { RootState } from "../store";

export function ArchivePage() {
  const archived = useArchivedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const filteredArchived = useMemo(
    () => archived.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [archived.data, search],
  );

  async function restore(job: JobApplication) {
    await mutations.restore.mutateAsync(job.id);
  }

  async function remove(job: JobApplication) {
    if (!window.confirm(`Permanently delete ${job.company} — ${job.position}? This cannot be undone.`)) return;
    await mutations.remove.mutateAsync(job.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <PageIntro
        eyebrow="Past opportunities"
        title="Archive"
        description="Restore an application or remove it permanently."
      />
      <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <ApplicationSearch />
      </div>
      {archived.isPending && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm leading-6 text-muted">
          Loading archive…
        </p>
      )}
      {archived.error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          Unable to load archive: {archived.error.message}
        </p>
      )}
      {archived.data && !archived.data.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          Your archive is empty.
        </p>
      )}
      {archived.data && archived.data.length > 0 && filteredArchived.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredArchived.map((job) => (
            <Card key={job.id}>
              <CardContent className="space-y-4 p-5">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-ink">{job.company}</h2>
                  <p className="break-words text-sm leading-6 text-muted">{job.position}</p>
                  {job.location && <p className="mt-1 break-words text-sm leading-6 text-muted">{job.location}</p>}
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Archived{" "}
                    {job.archivedAt
                      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(job.archivedAt))
                      : "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => restore(job)}
                    disabled={mutations.restore.isPending}
                  >
                    Restore
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(job)}
                    disabled={mutations.remove.isPending}
                  >
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {archived.data && archived.data.length > 0 && !filteredArchived.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          No archived applications match the current search.
        </p>
      )}
      {(mutations.restore.error || mutations.remove.error) && (
        <p className="text-sm leading-6 text-rose-600 dark:text-rose-400">
          {(mutations.restore.error || mutations.remove.error)?.message}
        </p>
      )}
    </div>
  );
}
