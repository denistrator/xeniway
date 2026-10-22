import type { JobStatus } from "@xeniway/shared";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useCanMutate } from "../features/offline/offline-access.model";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { useApplicationMutations, useApplications } from "../lib/queries";

export function useHomePage() {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const applications = useApplications();
  const mutations = useApplicationMutations();
  const [removeAllOpen, setRemoveAllOpen] = useState(false);
  const [dangerOpen, setDangerOpen] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [boardOperationError, setBoardOperationError] = useState<string | null>(null);
  const [boardOperationSuccess, setBoardOperationSuccess] = useState<string | null>(null);
  useEffect(() => {
    if (!dangerOpen) {
      return;
    }
    setCountdown(5);
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [dangerOpen]);
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

  function openRemoveAll() {
    setRemoveAllOpen(true);
  }
  function closeRemoveAll() {
    setRemoveAllOpen(false);
  }
  function confirmRemoveAll() {
    setRemoveAllOpen(false);
    setDangerOpen(true);
  }
  function closeDanger() {
    setDangerOpen(false);
  }
  function retryApplications() {
    void applications.refetch();
  }
  async function handleRemoveAll() {
    await mutations.removeAll.mutateAsync("active");
    setDangerOpen(false);
  }
  return {
    canMutate,
    applications,
    boardOperationError,
    boardOperationSuccess,
    handleStatusChange,
    handleReorder,
    removeAllOpen,
    dangerOpen,
    countdown,
    openRemoveAll,
    closeRemoveAll,
    confirmRemoveAll,
    closeDanger,
    handleRemoveAll,
    retryApplications,
    dangerYesLabel: countdown ? `${t("common.actions.yes")} (${countdown})` : t("common.actions.yes"),
    applicationsTitle: t("navigation.applications"),
    homeDescription: t("applications.homeDescription"),
    removeAll: t("common.actions.removeAll"),
    loading: t("applications.loading"),
    errorMessage: t(getApiErrorKey(errorCode)),
    retry: t("common.actions.retry"),
    empty: t("applications.empty"),
    title: t("applications.confirmation.title"),
    deleteAllConfirmation: t("common.actions.deleteAllConfirmation"),
    yes: t("common.actions.yes"),
    no: t("common.actions.no"),
    dangerTitle: t("applications.confirmation.dangerTitle"),
    dangerConfirmation: t("common.actions.dangerConfirmation"),
  };
}
