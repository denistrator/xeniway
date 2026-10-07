import type { JobApplication } from "@xeniway/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { formatDate, getApiErrorKey } from "../../../i18n/format.ts";
import { ApiRequestError } from "../../../lib/api.ts";
import { matchesApplicationSearch } from "../../../lib/application-filters.ts";
import { useApplicationMutations, useArchivedApplications } from "../../../lib/queries.ts";
import type { RootState } from "../../../store.ts";

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
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
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
  const removeAllLabel = t("common.actions.removeAll");
  const openRemoveAll = () => setRemoveAllOpen(true);
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
  const removeAllTitle = t("applications.confirmation.title");
  const removeAllConfirmation = t("common.actions.deleteAllConfirmation");
  const removeAllYesLabel = t("common.actions.yes");
  const removeAllNoLabel = t("common.actions.no");
  const removeAll = async () => {
    await mutations.removeAll.mutateAsync("archive");
    setRemoveAllOpen(false);
  };
  const cancelRemoveAll = () => setRemoveAllOpen(false);
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
    removeAllOpen,
    remove,
    archivedDateLabel,
    errorMessage,
    title,
    description,
    loadingMessage,
    emptyMessage,
    noMatchMessage,
    removeAllLabel,
    openRemoveAll,
    restoreLabel,
    deleteLabel,
    restoreJob,
    requestRemoval,
    confirmationTitle,
    deleteConfirmation,
    yesLabel,
    noLabel,
    cancelRemoval,
    removeAllTitle,
    removeAllConfirmation,
    removeAllYesLabel,
    removeAllNoLabel,
    removeAll,
    cancelRemoveAll,
  };
}
