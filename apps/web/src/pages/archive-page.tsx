import type { JobApplication } from "@job-tracker/shared";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useApplicationMutations, useArchivedApplications } from "../lib/queries";

export function ArchivePage() {
  const archived = useArchivedApplications();
  const mutations = useApplicationMutations();

  async function restore(job: JobApplication) {
    await mutations.restore.mutateAsync(job.id);
  }

  async function remove(job: JobApplication) {
    if (!window.confirm(`Permanently delete ${job.company} — ${job.position}? This cannot be undone.`)) return;
    await mutations.remove.mutateAsync(job.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent">Past opportunities</p>
        <h1 className="font-display mt-2 text-4xl font-bold tracking-tight text-ink">Archive</h1>
        <p className="mt-2 text-muted">Restore an application or remove it permanently.</p>
      </div>
      {archived.isPending && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm text-muted">
          Loading archive…
        </p>
      )}
      {archived.error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          Unable to load archive: {archived.error.message}
        </p>
      )}
      {archived.data && !archived.data.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-muted">
          Your archive is empty.
        </p>
      )}
      {archived.data && archived.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {archived.data.map((job) => (
            <Card key={job.id}>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="font-semibold text-ink">{job.company}</h2>
                  <p className="text-sm text-muted">{job.position}</p>
                  {job.location && <p className="mt-1 text-xs text-muted">{job.location}</p>}
                  <p className="mt-2 text-xs text-muted">
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
      {(mutations.restore.error || mutations.remove.error) && (
        <p className="text-sm text-rose-600 dark:text-rose-400">
          {(mutations.restore.error || mutations.remove.error)?.message}
        </p>
      )}
    </div>
  );
}
