import type { JobApplication } from "@xeniway/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { formatDate, getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useBlacklistedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";
import { ApplicationCollection } from "../collection/application-collection";
import { ApplicationCollectionCard } from "../collection/application-collection-card";

export function BlacklistPage() {
  const { i18n, t } = useTranslation();
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => blacklisted.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [blacklisted.data, search],
  );
  const [pendingRemoval, setPendingRemoval] = useState<JobApplication | null>(null);
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  async function remove() {
    if (!pendingRemoval) return;
    await mutations.remove.mutateAsync(pendingRemoval.id);
    setPendingRemoval(null);
  }
  const error = blacklisted.error || mutations.unblacklist.error || mutations.remove.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  return (
    <>
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
        removeAllLabel={t("common.actions.removeAll")}
        onRemoveAll={() => setRemoveAllOpen(true)}
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
            onDelete={() => setPendingRemoval(job)}
            busy={mutations.unblacklist.isPending || mutations.remove.isPending}
          />
        ))}
      </ApplicationCollection>
      {pendingRemoval && (
        <ConfirmationModal
          title={t("applications.confirmation.title")}
          text={t("applications.blacklist.deleteConfirmation", pendingRemoval)}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={remove}
          onNo={() => setPendingRemoval(null)}
        />
      )}
      {removeAllOpen && (
        <ConfirmationModal
          title={t("applications.confirmation.title")}
          text={t("common.actions.deleteAllConfirmation")}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={async () => {
            await mutations.removeAll.mutateAsync("blacklist");
            setRemoveAllOpen(false);
          }}
          onNo={() => setRemoveAllOpen(false)}
        />
      )}
    </>
  );
}
