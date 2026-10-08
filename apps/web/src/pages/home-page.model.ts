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
  useEffect(() => {
    if (!dangerOpen) {
      return;
    }
    setCountdown(5);
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [dangerOpen]);
  async function handleStatusChange(id: number, status: JobStatus) {
    await mutations.update.mutateAsync({ id, input: { status } });
  }

  async function handleReorder(status: JobStatus, applicationIds: number[]) {
    await mutations.reorder.mutateAsync({ status, applicationIds });
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
  async function handleRemoveAll() {
    await mutations.removeAll.mutateAsync("active");
    setDangerOpen(false);
  }
  return {
    canMutate,
    applications,
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
    dangerYesLabel: countdown ? `${t("common.actions.yes")} (${countdown})` : t("common.actions.yes"),
    applicationsTitle: t("navigation.applications"),
    homeDescription: t("applications.homeDescription"),
    removeAll: t("common.actions.removeAll"),
    loading: t("applications.loading"),
    errorMessage: t(getApiErrorKey(errorCode)),
    empty: t("applications.empty"),
    title: t("applications.confirmation.title"),
    deleteAllConfirmation: t("common.actions.deleteAllConfirmation"),
    yes: t("common.actions.yes"),
    no: t("common.actions.no"),
    dangerTitle: t("applications.confirmation.dangerTitle"),
    dangerConfirmation: t("common.actions.dangerConfirmation"),
  };
}
