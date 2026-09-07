import type { JobApplication } from "@job-tracker/shared";
import { statusLabels } from "../components/job/job-status";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { useApplicationMutations, useBlacklistedApplications } from "../lib/queries";

export function BlacklistPage() {
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();

  async function restore(job: JobApplication) {
    await mutations.unblacklist.mutateAsync(job.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <PageIntro
        eyebrow="Excluded opportunities"
        title="Blacklist"
        description="Keep employers you do not want to pursue out of your active workflow."
      />
      {blacklisted.isPending && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm text-muted">
          Loading blacklist…
        </p>
      )}
      {blacklisted.error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        >
          Unable to load blacklist: {blacklisted.error.message}
        </p>
      )}
      {blacklisted.data && !blacklisted.data.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm text-muted">
          Your blacklist is empty.
        </p>
      )}
      {blacklisted.data && blacklisted.data.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {blacklisted.data.map((job) => (
            <Card key={job.id}>
              <CardContent className="space-y-4 p-5">
                <div>
                  <h2 className="font-semibold text-ink">{job.company}</h2>
                  <p className="text-sm text-muted">{job.position}</p>
                  <p className="mt-2 text-xs text-muted">Status: {statusLabels[job.status]}</p>
                  {job.blacklistReason && (
                    <p className="mt-3 rounded-lg bg-surface-tint p-3 text-sm text-ink">{job.blacklistReason}</p>
                  )}
                  <p className="mt-2 text-xs text-muted">
                    Blacklisted{" "}
                    {job.blacklistedAt
                      ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(job.blacklistedAt))
                      : "—"}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => restore(job)}
                  disabled={mutations.unblacklist.isPending}
                >
                  Remove from blacklist
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {mutations.unblacklist.error && (
        <p className="text-sm text-rose-600 dark:text-rose-400">{mutations.unblacklist.error.message}</p>
      )}
    </div>
  );
}
