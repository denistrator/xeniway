import { Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/ui/button";
import { useApplicationsCsvExport } from "../../lib/queries";

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

export function CsvExportButton() {
  const { t } = useTranslation();
  const exportMutation = useApplicationsCsvExport();

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        disabled={exportMutation.isPending}
        onClick={() =>
          exportMutation.mutate(undefined, { onSuccess: ({ blob, filename }) => downloadCsv(blob, filename) })
        }
      >
        <Download aria-hidden="true" size={15} />
        {exportMutation.isPending ? t("common.actions.exportingCsv") : t("common.actions.exportCsv")}
      </Button>
      {exportMutation.isError && (
        <span role="alert" className="text-xs text-rose-600 dark:text-rose-400">
          {t("common.actions.exportCsvFailed")}
        </span>
      )}
    </>
  );
}
