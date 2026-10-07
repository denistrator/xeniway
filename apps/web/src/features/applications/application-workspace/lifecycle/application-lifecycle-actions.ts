import type { JobApplication } from "@xeniway/shared";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { getApiErrorKey } from "../../../../i18n/format.ts";
import { ApiRequestError } from "../../../../lib/api.ts";
import { useCanMutate } from "../../../offline/offline-access.tsx";
import { useReturnFocus } from "../shared/use-return-focus.ts";
import { type ApplicationLifecycleAction, useApplicationLifecycle } from "./use-application-lifecycle.ts";

export type ApplicationLifecycleActionsProps = { application: JobApplication };
export function useApplicationLifecycleActions({ application }: ApplicationLifecycleActionsProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const lifecycle = useApplicationLifecycle(application);
  const [pendingAction, setPendingAction] = useState<ApplicationLifecycleAction | null>(null);
  const actionsRef = useRef<HTMLElement>(null);
  const rememberFocus = useReturnFocus(pendingAction !== null, actionsRef);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const [restoreErrorKey, setRestoreErrorKey] = useState<string | null>(null);
  const labels: Record<ApplicationLifecycleAction, string> = {
    archive: t("applications.workspace.archive"),
    blacklist: t("applications.workspace.blacklist"),
    restore: t("applications.workspace.restore"),
    delete: t("applications.workspace.delete"),
  };
  async function restore() {
    if (!canMutate) {
      return;
    }
    setRestoreErrorKey(null);
    try {
      await lifecycle.execute("restore");
    } catch (error) {
      setRestoreErrorKey(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
    }
  }
  async function executeConfirmedAction() {
    if (!canMutate || !pendingAction) {
      return;
    }
    setActionErrorKey(null);
    try {
      await lifecycle.execute(pendingAction);
      setPendingAction(null);
    } catch (error) {
      setActionErrorKey(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
    }
  }
  function request(action: ApplicationLifecycleAction) {
    if (!canMutate) {
      return;
    }
    if (document.activeElement instanceof HTMLElement) {
      rememberFocus(document.activeElement);
    }
    setActionErrorKey(null);
    setPendingAction(action);
  }
  function requestArchive() {
    request("archive");
  }
  function requestBlacklist() {
    request("blacklist");
  }
  function requestDelete() {
    request("delete");
  }
  function restoreAction() {
    void restore();
  }
  function confirmAction() {
    void executeConfirmedAction();
  }
  function cancelAction() {
    setActionErrorKey(null);
    setPendingAction(null);
  }
  const restoreErrorText = restoreErrorKey ? t(restoreErrorKey) : null;
  const actionErrorText = actionErrorKey ? t(actionErrorKey) : null;
  const confirmationTitle = pendingAction === "restore" ? labels.restore : t("applications.confirmation.title");
  const confirmationText = pendingAction ? t(`applications.workspace.confirm.${pendingAction}`) : "";
  const actionsLabel = t("applications.workspace.actionsLabel");
  const noLabel = t("common.actions.no");
  return {
    actionsRef,
    actionsLabel,
    lifecycle,
    canMutate,
    requestArchive,
    labels,
    requestBlacklist,
    restoreAction,
    requestDelete,
    restoreErrorKey,
    restoreErrorText,
    pendingAction,
    confirmationTitle,
    confirmationText,
    noLabel,
    confirmAction,
    cancelAction,
    actionErrorKey,
    actionErrorText,
  };
}
