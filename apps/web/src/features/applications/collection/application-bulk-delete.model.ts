import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError, type ApplicationList } from "../../../lib/api";
import { useCanMutate } from "../../offline/offline-access.model";

export type ApplicationBulkDeleteProps = {
  board: ApplicationList;
  count: number;
  deleteApplications: (board: ApplicationList) => Promise<unknown>;
};

export function useApplicationBulkDelete({ board, count, deleteApplications }: ApplicationBulkDeleteProps) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const headingId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement>(null);
  const inFlight = useRef(false);
  const [stage, setStage] = useState<"closed" | "scope" | "confirm">("closed");
  const [countdown, setCountdown] = useState(5);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();
  const [succeeded, setSucceeded] = useState(false);
  const disabled = !canMutate || count === 0 || pending;
  const waiting = board === "active" && countdown > 0;
  const deleteLabel = t(`applications.bulkDelete.${board}`);
  const scopeText = t("applications.bulkDelete.scope", { count });

  useEffect(() => {
    if (stage !== "confirm" || board !== "active") {
      return;
    }
    const timer = window.setInterval(() => setCountdown((value) => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [stage, board]);

  function open() {
    if (disabled || inFlight.current) {
      return;
    }
    setError(undefined);
    setSucceeded(false);
    returnFocusRef.current = triggerRef.current;
    setStage(board === "active" ? "scope" : "confirm");
  }

  function close() {
    if (!inFlight.current) {
      setStage("closed");
    }
  }

  function continueToConfirmation() {
    setCountdown(5);
    setStage("confirm");
  }

  async function confirm() {
    if (stage !== "confirm" || disabled || waiting || inFlight.current) {
      return;
    }
    inFlight.current = true;
    setPending(true);
    setError(undefined);
    try {
      await deleteApplications(board);
      returnFocusRef.current = regionRef.current;
      setSucceeded(true);
      setStage("closed");
    } catch (failure) {
      const code = failure instanceof ApiRequestError ? failure.code : "REQUEST_FAILED";
      setError(t(getApiErrorKey(code)));
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }

  let confirmLabel = deleteLabel;
  if (pending) {
    confirmLabel = t("applications.bulkDelete.deleting");
  } else if (waiting) {
    confirmLabel = `${deleteLabel} (${countdown})`;
  }

  return {
    headingId,
    regionRef,
    triggerRef,
    returnFocusRef,
    stage,
    pending,
    error,
    disabled,
    confirmDisabled: disabled || waiting,
    open,
    close,
    continueToConfirmation,
    confirm,
    deleteLabel,
    confirmLabel,
    scopeText,
    actionsLabel: t("applications.bulkDelete.actions"),
    continueLabel: t("applications.bulkDelete.continue"),
    cancelLabel: t("applications.workspace.actions.cancel"),
    successMessage: succeeded ? t("applications.bulkDelete.deleted") : undefined,
    dangerTitle: t("applications.confirmation.dangerTitle"),
  };
}
