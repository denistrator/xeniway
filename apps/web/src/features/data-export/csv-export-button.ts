import { useTranslation } from "react-i18next";
import { useApplicationsCsvExport } from "../../lib/queries";
import { useCanMutate } from "../offline/offline-access.ts";

function downloadCsv(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function useCsvExportButton() {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const exportMutation = useApplicationsCsvExport();

  const handleExport = () =>
    exportMutation.mutate(undefined, {
      onSuccess: ({ blob, filename }) => downloadCsv(blob, filename),
    });
  return {
    disabled: exportMutation.isPending || !canMutate,
    handleExport,
    label: exportMutation.isPending ? t("common.actions.exportingCsv") : t("common.actions.exportCsv"),
    isError: exportMutation.isError,
    errorLabel: t("common.actions.exportCsvFailed"),
  };
}
