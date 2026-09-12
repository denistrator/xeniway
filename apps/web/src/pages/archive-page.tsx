import type { JobApplication } from "@xeniway/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { ApplicationSearch } from "../components/application-search";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { formatDate, getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { matchesApplicationSearch } from "../lib/application-filters";
import { useApplicationMutations, useArchivedApplications } from "../lib/queries";
import type { RootState } from "../store";

export function ArchivePage() {
  const { i18n, t } = useTranslation();
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
    if (!window.confirm(t("applications.archive.deleteConfirmation", job))) return;
    await mutations.remove.mutateAsync(job.id);
  }

  const mutationError = mutations.restore.error || mutations.remove.error;
  const mutationErrorCode = mutationError instanceof ApiRequestError ? mutationError.code : "REQUEST_FAILED";

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <PageIntro title={t("applications.archive.title")} description={t("applications.archive.description")} />
      <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <ApplicationSearch />
      </div>
      {archived.isPending && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm leading-6 text-muted">
          {t("applications.archive.loading")}
        </p>
      )}
      {archived.error && (
        <p className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
          {t(getApiErrorKey(archived.error instanceof ApiRequestError ? archived.error.code : "REQUEST_FAILED"))}
        </p>
      )}
      {archived.data && !archived.data.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {t("applications.archive.empty")}
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
                    {t("applications.archive.archived", {
                      date: job.archivedAt ? formatDate(job.archivedAt, i18n.resolvedLanguage ?? "en") : "—",
                    })}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    className="flex-1"
                    size="sm"
                    onClick={() => restore(job)}
                    disabled={mutations.restore.isPending}
                  >
                    {t("applications.archive.restore")}
                  </Button>
                  <Button
                    className="flex-1"
                    variant="outline"
                    size="sm"
                    onClick={() => remove(job)}
                    disabled={mutations.remove.isPending}
                  >
                    {t("applications.archive.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {archived.data && archived.data.length > 0 && !filteredArchived.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {t("applications.archive.noMatch")}
        </p>
      )}
      {mutationError && (
        <p className="text-sm leading-6 text-rose-600 dark:text-rose-400">{t(getApiErrorKey(mutationErrorCode))}</p>
      )}
    </div>
  );
}
