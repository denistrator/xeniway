import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { jobStatuses } from "../job-status";
import { StatusFilterOptions } from "./status-filter-options";
import { useStatusFilter } from "./use-status-filter";

export function StatusFilter() {
  const { t } = useTranslation();
  const filter = useStatusFilter();
  return (
    <div ref={filter.containerRef} className="relative w-full sm:w-auto">
      <Button
        ref={filter.triggerRef}
        variant="outline"
        className="w-full sm:w-auto"
        aria-haspopup="dialog"
        aria-expanded={filter.open}
        aria-controls="status-filter-options"
        onClick={() => filter.setOpen((current) => !current)}
      >
        {t("applications.filterStatuses")}
        <span className="ms-2 text-xs text-muted">
          {filter.allSelected
            ? t("applications.allStatuses")
            : `${filter.visibleStatuses.length}/${jobStatuses.length}`}
        </span>
      </Button>
      {filter.open && <StatusFilterOptions {...filter} />}
    </div>
  );
}
