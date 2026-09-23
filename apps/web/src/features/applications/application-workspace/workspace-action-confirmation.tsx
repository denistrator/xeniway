import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";
import type { WorkspaceAction } from "./workspace-lifecycle-actions";

export function WorkspaceActionConfirmation({
  action,
  label,
  pending,
  onConfirm,
  onClose,
}: {
  action: WorkspaceAction;
  label: string;
  pending: boolean;
  onConfirm: (action: WorkspaceAction) => Promise<void>;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  async function confirm() {
    setError(null);
    try {
      await onConfirm(action);
      onClose();
    } catch (cause) {
      setError(getApiErrorKey(cause instanceof ApiRequestError ? cause.code : "REQUEST_FAILED"));
    }
  }

  return (
    <>
      <ConfirmationModal
        title={
          action === "delete" || action === "archive" || action === "blacklist"
            ? t("applications.confirmation.title")
            : label
        }
        text={t(`applications.workspace.confirm.${action}`)}
        yesLabel={label}
        noLabel={t("common.actions.no")}
        yesDisabled={pending}
        onYes={() => void confirm()}
        onNo={onClose}
      />
      {error && (
        <p
          role="alert"
          className="fixed inset-x-4 bottom-4 z-[80] mx-auto max-w-md rounded-xl bg-surface p-4 text-sm text-rose-600 shadow-lg"
        >
          {t(error)}
        </p>
      )}
    </>
  );
}
