import type { JobApplication } from "@xeniway/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { formatDate, getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useArchivedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";

export function useArchivePagePresentation() {
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
    if (!pendingRemoval) {
      return;
    }
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
  const isEmpty = Boolean(archived.data && !archived.data.length);
  const busy = mutations.restore.isPending || mutations.remove.isPending;
  const title = t("applications.archive.title");
  const description = t("applications.archive.description");
  const loadingMessage = t("applications.archive.loading");
  const emptyMessage = t("applications.archive.empty");
  const noMatchMessage = t("applications.archive.noMatch");
  const restoreLabel = t("applications.archive.restore");
  const deleteLabel = t("applications.archive.delete");
  function restoreJob(job: JobApplication) {
    return () => restore(job.id);
  }
  function requestRemoval(job: JobApplication) {
    return () => setPendingRemoval(job);
  }
  const confirmationTitle = t("applications.confirmation.title");
  const deleteConfirmation = pendingRemoval ? t("applications.archive.deleteConfirmation", pendingRemoval) : "";
  const yesLabel = t("common.actions.yes");
  const noLabel = t("common.actions.no");
  const cancelRemoval = () => setPendingRemoval(null);
  function archivedDateLabel(job: JobApplication) {
    return t("applications.archive.archived", {
      date: job.archivedAt ? formatDate(job.archivedAt, i18n.resolvedLanguage ?? "en") : "—",
    });
  }
  return {
    archived,
    isEmpty,
    busy,
    mutations,
    items,
    pendingRemoval,
    applicationCount: archived.data?.length ?? 0,
    deleteApplications: mutations.removeAll.mutateAsync,
    remove,
    archivedDateLabel,
    errorMessage,
    title,
    description,
    loadingMessage,
    emptyMessage,
    noMatchMessage,
    restoreLabel,
    deleteLabel,
    restoreJob,
    requestRemoval,
    confirmationTitle,
    deleteConfirmation,
    yesLabel,
    noLabel,
    cancelRemoval,
  };
}
