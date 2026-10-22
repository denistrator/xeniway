import type { JobStatus } from "@xeniway/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useApplicationMutations, useApplications } from "../lib/queries";

export function useHomePage() {
  const { t } = useTranslation();
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const [boardOperationError, setBoardOperationError] = useState<string | null>(null);
  const [boardOperationSuccess, setBoardOperationSuccess] = useState<string | null>(null);
  async function handleStatusChange(id: number, status: JobStatus) {
    setBoardOperationError(null);
    setBoardOperationSuccess(null);
    try {
      await mutations.update.mutateAsync({ id, input: { status } });
      setBoardOperationSuccess(t("applications.board.updated"));
    } catch (error) {
      const errorCode = error instanceof ApiRequestError ? error.code : "REQUEST_FAILED";
      setBoardOperationError(t(getApiErrorKey(errorCode)));
    }
  }

  async function handleReorder(status: JobStatus, applicationIds: number[]) {
    setBoardOperationError(null);
    setBoardOperationSuccess(null);
    try {
      await mutations.reorder.mutateAsync({ status, applicationIds });
      setBoardOperationSuccess(t("applications.board.updated"));
    } catch (error) {
      const errorCode = error instanceof ApiRequestError ? error.code : "REQUEST_FAILED";
      setBoardOperationError(t(getApiErrorKey(errorCode)));
    }
  }

  const errorCode = applications.error instanceof ApiRequestError ? applications.error.code : "REQUEST_FAILED";

  function retryApplications() {
    void applications.refetch();
  }
  return {
    applications,
    applicationCount: applications.data?.length ?? 0,
    deleteApplications: mutations.removeAll.mutateAsync,
    boardOperationError,
    boardOperationSuccess,
    handleStatusChange,
    handleReorder,
    retryApplications,
    applicationsTitle: t("navigation.applications"),
    homeDescription: t("applications.homeDescription"),
    loading: t("applications.loading"),
    errorMessage: t(getApiErrorKey(errorCode)),
    retry: t("common.actions.retry"),
    empty: t("applications.empty"),
  };
}
