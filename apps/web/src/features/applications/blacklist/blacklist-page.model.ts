import type { JobApplication } from "@xeniway/shared";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { formatDate, getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import { matchesApplicationSearch } from "../../../lib/application-filters";
import { useApplicationMutations, useBlacklistedApplications } from "../../../lib/queries";
import type { RootState } from "../../../store";

export function useBlacklistPagePresentation() {
  const { i18n, t } = useTranslation();
  const blacklisted = useBlacklistedApplications();
  const mutations = useApplicationMutations();
  const search = useSelector((state: RootState) => state.ui.search);
  const items = useMemo(
    () => blacklisted.data?.filter((job) => matchesApplicationSearch(job, search)) ?? [],
    [blacklisted.data, search],
  );
  const [pendingRemoval, setPendingRemoval] = useState<JobApplication | null>(null);
  async function remove() {
    if (!pendingRemoval) {
      return;
    }
    await mutations.remove.mutateAsync(pendingRemoval.id);
    setPendingRemoval(null);
  }
  const error = blacklisted.error || mutations.unblacklist.error || mutations.remove.error;
  const errorMessage = error
    ? t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))
    : undefined;
  const isEmpty = Boolean(blacklisted.data && !blacklisted.data.length);
  const busy = mutations.unblacklist.isPending || mutations.remove.isPending;
  const title = t("applications.blacklist.title");
  const description = t("applications.blacklist.description");
  const loadingMessage = t("applications.blacklist.loading");
  const emptyMessage = t("applications.blacklist.empty");
  const noMatchMessage = t("applications.blacklist.noMatch");
  const restoreLabel = t("applications.blacklist.restore");
  const deleteLabel = t("applications.blacklist.delete");
  function restoreJob(job: JobApplication) {
    return () => mutations.unblacklist.mutateAsync(job.id);
  }
  function requestRemoval(job: JobApplication) {
    return () => setPendingRemoval(job);
  }
  const confirmationTitle = t("applications.confirmation.title");
  const deleteConfirmation = pendingRemoval ? t("applications.blacklist.deleteConfirmation", pendingRemoval) : "";
  const yesLabel = t("common.actions.yes");
  const noLabel = t("common.actions.no");
  const cancelRemoval = () => setPendingRemoval(null);
  function blacklistedDateLabel(job: JobApplication) {
    return t("applications.blacklist.blacklisted", {
      date: job.blacklistedAt ? formatDate(job.blacklistedAt, i18n.resolvedLanguage ?? "en") : "—",
    });
  }
  return {
    blacklistedDateLabel,
    blacklisted,
    isEmpty,
    busy,
    mutations,
    items,
    pendingRemoval,
    applicationCount: blacklisted.data?.length ?? 0,
    deleteApplications: mutations.removeAll.mutateAsync,
    remove,
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
