import type { JobApplication } from "@xeniway/shared";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { ApplicationSearch } from "../components/application-search";
import { getStatusLabel } from "../components/job/job-status";
import { PageIntro } from "../components/page-intro";
import { Button } from "../components/ui/button";
import { Card, CardContent } from "../components/ui/card";
import { formatDate, getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { matchesApplicationSearch } from "../lib/application-filters";
import { useApplicationMutations, useBlacklistedApplications } from "../lib/queries";
import type { RootState } from "../store";

export function BlacklistPage() {
  const { i18n, t } = useTranslation();
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const filteredBlacklisted = useMemo(
    () => blacklisted.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [blacklisted.data, search],
  );

  async function restore(job: JobApplication) {
    await mutations.unblacklist.mutateAsync(job.id);
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-6">
      <PageIntro title={t("applications.blacklist.title")} description={t("applications.blacklist.description")} />
      <div className="flex flex-wrap gap-3 rounded-2xl border border-line bg-surface p-4 shadow-sm">
        <ApplicationSearch />
      </div>
      {blacklisted.isPending && (
        <p role="status" aria-live="polite" className="py-10 text-center text-sm leading-6 text-muted">
          {t("applications.blacklist.loading")}
        </p>
      )}
      {blacklisted.error && (
        <p
          role="alert"
          className="rounded-xl bg-rose-50 p-4 text-sm leading-6 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
        >
          {t(getApiErrorKey(blacklisted.error instanceof ApiRequestError ? blacklisted.error.code : "REQUEST_FAILED"))}
        </p>
      )}
      {blacklisted.data && !blacklisted.data.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {t("applications.blacklist.empty")}
        </p>
      )}
      {blacklisted.data && blacklisted.data.length > 0 && filteredBlacklisted.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredBlacklisted.map((job) => (
            <Card key={job.id}>
              <CardContent className="space-y-4 p-5">
                <div className="min-w-0">
                  <h2 className="break-words font-semibold text-ink">{job.company}</h2>
                  <p className="break-words text-sm leading-6 text-muted">{job.position}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t("applications.blacklist.status", { status: getStatusLabel(t, job.status) })}
                  </p>
                  {job.blacklistReason && (
                    <p className="mt-3 break-words rounded-lg bg-surface-tint p-3 text-sm leading-6 text-ink">
                      {job.blacklistReason}
                    </p>
                  )}
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {t("applications.blacklist.blacklisted", {
                      date: job.blacklistedAt ? formatDate(job.blacklistedAt, i18n.resolvedLanguage ?? "en") : "—",
                    })}
                  </p>
                </div>
                <Button
                  className="w-full"
                  size="sm"
                  onClick={() => restore(job)}
                  disabled={mutations.unblacklist.isPending}
                >
                  {t("applications.blacklist.remove")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {blacklisted.data && blacklisted.data.length > 0 && !filteredBlacklisted.length && (
        <p className="rounded-2xl border border-dashed border-line p-12 text-center text-sm leading-6 text-muted">
          {t("applications.blacklist.noMatch")}
        </p>
      )}
      {mutations.unblacklist.error && (
        <p className="text-sm leading-6 text-rose-600 dark:text-rose-400">
          {t(
            getApiErrorKey(
              mutations.unblacklist.error instanceof ApiRequestError
                ? mutations.unblacklist.error.code
                : "REQUEST_FAILED",
            ),
          )}
        </p>
      )}
    </div>
  );
}
