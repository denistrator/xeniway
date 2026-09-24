import type { JobApplication } from "@xeniway/shared";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { ConfirmationModal } from "../../../../components/ui/confirmation-modal";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";
import { type ApplicationLifecycleAction, useApplicationLifecycle } from "./use-application-lifecycle";

export function ApplicationLifecycleActions({ application }: { application: JobApplication }) {
  const { t } = useTranslation();
  const lifecycle = useApplicationLifecycle(application);
  const [pendingAction, setPendingAction] = useState<ApplicationLifecycleAction | null>(null);
  const [actionErrorKey, setActionErrorKey] = useState<string | null>(null);
  const [restoreErrorKey, setRestoreErrorKey] = useState<string | null>(null);
  const labels: Record<ApplicationLifecycleAction, string> = {
    archive: t("applications.workspace.archive"),
    blacklist: t("applications.workspace.blacklist"),
    restore: t("applications.workspace.restore"),
    delete: t("applications.workspace.delete"),
  };

  async function restore() {
    setRestoreErrorKey(null);
    try {
      await lifecycle.execute("restore");
    } catch (error) {
      setRestoreErrorKey(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
    }
  }

  async function executeConfirmedAction() {
    if (!pendingAction) return;
    setActionErrorKey(null);
    try {
      await lifecycle.execute(pendingAction);
      setPendingAction(null);
    } catch (error) {
      setActionErrorKey(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
    }
  }

  function request(action: ApplicationLifecycleAction) {
    setActionErrorKey(null);
    setPendingAction(action);
  }

  return (
    <>
      <nav aria-label={t("applications.workspace.actionsLabel")} className="flex flex-wrap gap-2 lg:justify-self-end">
        {lifecycle.board === "active" ? (
          <>
            <Button variant="outline" onClick={() => request("archive")}>
              {labels.archive}
            </Button>
            <Button variant="ghost" onClick={() => request("blacklist")}>
              {labels.blacklist}
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => void restore()} disabled={lifecycle.pending}>
              {labels.restore}
            </Button>
            <Button variant="outline" onClick={() => request("delete")}>
              {labels.delete}
            </Button>
          </>
        )}
      </nav>
      {restoreErrorKey && (
        <p role="alert" className="text-sm text-rose-600">
          {t(restoreErrorKey)}
        </p>
      )}
      {pendingAction && (
        <ConfirmationModal
          title={pendingAction === "restore" ? labels.restore : t("applications.confirmation.title")}
          text={t(`applications.workspace.confirm.${pendingAction}`)}
          yesLabel={labels[pendingAction]}
          noLabel={t("common.actions.no")}
          yesDisabled={lifecycle.pending}
          onYes={() => void executeConfirmedAction()}
          onNo={() => {
            setActionErrorKey(null);
            setPendingAction(null);
          }}
        />
      )}
      {actionErrorKey && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-md rounded-xl bg-surface p-4 text-sm text-rose-600 shadow-lg"
        >
          {t(actionErrorKey)}
        </p>
      )}
    </>
  );
}
