import type { ChangeEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { RootState } from "../../../store";
import { getStatusLabel, jobStatuses } from "../board/job-status";

export type StatusFilterOptionsProps = {
  selectAllRef: RefObject<HTMLInputElement | null>;
  visibleStatuses: RootState["ui"]["visibleStatuses"];
  allSelected: boolean;
  selectAll: (selected: boolean) => void;
  toggle: (status: RootState["ui"]["visibleStatuses"][number]) => void;
};

export function useStatusFilterOptionsPresentation({ selectAll, toggle, visibleStatuses }: StatusFilterOptionsProps) {
  const { t } = useTranslation();
  const filterStatusesLabel = t("applications.filterStatuses");
  const changeSelectAll = (event: ChangeEvent<HTMLInputElement>) => selectAll(event.target.checked);
  const selectAllStatusesLabel = t("applications.selectAllStatuses");
  const options = jobStatuses.map((status) => ({
    status,
    label: getStatusLabel(t, status),
    checked: visibleStatuses.includes(status),
    toggle: () => toggle(status),
  }));
  return { filterStatusesLabel, changeSelectAll, selectAllStatusesLabel, options };
}
