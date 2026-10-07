import { Download } from "lucide-react";
import { Button } from "../../components/ui/button.tsx";
import { csvExportButtonStyles } from "./csv-export-button.styles.ts";
import { useCsvExportButton } from "./csv-export-button.ts";

const styles = csvExportButtonStyles();
export function CsvExportButton() {
  const { disabled, handleExport, label, isError, errorLabel } = useCsvExportButton();
  return (
    <>
      <Button variant="outline" size="sm" disabled={disabled} onClick={handleExport}>
        <Download aria-hidden="true" size={15} />
        {label}
      </Button>
      {isError && (
        <span role="alert" className={styles.error()}>
          {errorLabel}
        </span>
      )}
    </>
  );
}
