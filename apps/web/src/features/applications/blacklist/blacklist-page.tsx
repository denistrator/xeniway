import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { formatDate, getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError, type JobApplication } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useBlacklistedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";
import { ApplicationCollection } from "../application-collection";
import { ApplicationCollectionCard } from "../application-collection-card";

export function BlacklistPage() {
  const { i18n, t } = useTranslation();
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => blacklisted.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [blacklisted.data, search],
  );
  async function remove(job: JobApplication) {
    if (window.confirm(t("applications.blacklist.deleteConfirmation", job))) await mutations.remove.mutateAsync(job.id);
  }
  const error = blacklisted.error || mutations.unblacklist.error || mutations.remove.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  return (
    <ApplicationCollection
      title={t("applications.blacklist.title")}
      description={t("applications.blacklist.description")}
      loadingMessage={t("applications.blacklist.loading")}
      emptyMessage={t("applications.blacklist.empty")}
      noMatchMessage={t("applications.blacklist.noMatch")}
      errorMessage={errorMessage}
      loading={blacklisted.isPending}
      isEmpty={Boolean(blacklisted.data && !blacklisted.data.length)}
      hasResults={items.length > 0}
    >
      {items.map((job) => (
        <ApplicationCollectionCard
          key={job.id}
          job={job}
          details={
            <>
              {job.blacklistReason && (
                <p className="break-words rounded-lg bg-surface-tint p-3 text-sm leading-6 text-ink">
                  {job.blacklistReason}
                </p>
              )}
              <p className="mt-2 text-sm leading-6 text-muted">
                {t("applications.blacklist.blacklisted", {
                  date: job.blacklistedAt ? formatDate(job.blacklistedAt, i18n.resolvedLanguage ?? "en") : "—",
                })}
              </p>
            </>
          }
          restoreLabel={t("applications.blacklist.restore")}
          deleteLabel={t("applications.blacklist.delete")}
          onRestore={() => mutations.unblacklist.mutateAsync(job.id)}
          onDelete={() => remove(job)}
          busy={mutations.unblacklist.isPending || mutations.remove.isPending}
        />
      ))}
    </ApplicationCollection>
  );
}
