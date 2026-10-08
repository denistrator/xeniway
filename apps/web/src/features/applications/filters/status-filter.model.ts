import { useTranslation } from "react-i18next";
import { jobStatuses } from "../board/job-status";
import { useStatusFilter } from "./use-status-filter";

export function useStatusFilterPresentation() {
  const { t } = useTranslation();
  const filter = useStatusFilter();
  const toggleOpen = () => filter.setOpen((current) => !current);
  const filterStatusesLabel = t("applications.filterStatuses");
  const allStatusesLabel = filter.allSelected
    ? t("applications.allStatuses")
    : `${filter.visibleStatuses.length}/${jobStatuses.length}`;
  return { filter, toggleOpen, filterStatusesLabel, allStatusesLabel };
}
