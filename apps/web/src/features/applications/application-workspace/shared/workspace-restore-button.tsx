import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/ui/button";
import { getApiErrorKey } from "../../../../i18n/format";
import { ApiRequestError } from "../../../../lib/api";

export function WorkspaceRestoreButton({
  label,
  pending,
  onRestore,
}: {
  label: string;
  pending: boolean;
  onRestore: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const [error, setError] = useState<string | null>(null);
  async function restore() {
    setError(null);
    try {
      await onRestore();
    } catch (cause) {
      setError(getApiErrorKey(cause instanceof ApiRequestError ? cause.code : "REQUEST_FAILED"));
    }
  }

  return (
    <>
      <Button onClick={() => void restore()} disabled={pending}>
        {label}
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600">
          {t(error)}
        </p>
      )}
    </>
  );
}
