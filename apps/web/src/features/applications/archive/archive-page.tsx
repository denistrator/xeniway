import type { JobApplication } from "@xeniway/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { formatDate, getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useArchivedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";
import { ApplicationCollection } from "../application-collection";
import { ApplicationCollectionCard } from "../application-collection-card";

export function ArchivePage() {
  const { i18n, t } = useTranslation();
  const archived = useArchivedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => archived.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [archived.data, search],
  );
  const [pendingRemoval, setPendingRemoval] = useState<JobApplication | null>(null);
  async function remove() {
    if (!pendingRemoval) return;
    await mutations.remove.mutateAsync(pendingRemoval.id);
    setPendingRemoval(null);
  }
  async function restore(id: number) {
    await mutations.restore.mutateAsync(id);
  }
  const error = mutations.restore.error || mutations.remove.error || archived.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  return (
    <>
      <ApplicationCollection
        title={t("applications.archive.title")}
        description={t("applications.archive.description")}
        loadingMessage={t("applications.archive.loading")}
        emptyMessage={t("applications.archive.empty")}
        noMatchMessage={t("applications.archive.noMatch")}
        errorMessage={errorMessage}
        loading={archived.isPending}
        isEmpty={Boolean(archived.data && !archived.data.length)}
        hasResults={items.length > 0}
      >
        {items.map((job) => (
          <ApplicationCollectionCard
            key={job.id}
            job={job}
            details={
              <p className="mt-2 text-sm leading-6 text-muted">
                {t("applications.archive.archived", {
                  date: job.archivedAt ? formatDate(job.archivedAt, i18n.resolvedLanguage ?? "en") : "—",
                })}
              </p>
            }
            restoreLabel={t("applications.archive.restore")}
            deleteLabel={t("applications.archive.delete")}
            onRestore={() => restore(job.id)}
            onDelete={() => setPendingRemoval(job)}
            busy={mutations.restore.isPending || mutations.remove.isPending}
          />
        ))}
      </ApplicationCollection>
      {pendingRemoval && (
        <ConfirmationModal
          title={t("applications.confirmation.title")}
          text={t("applications.archive.deleteConfirmation", pendingRemoval)}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={remove}
          onNo={() => setPendingRemoval(null)}
        />
      )}
    </>
  );
}
