import type { RefObject } from "react";
import { useTranslation } from "react-i18next";
import type { RootState } from "../../../store";
import { getStatusLabel, jobStatuses } from "../job-status";

export function StatusFilterOptions({
  selectAllRef,
  visibleStatuses,
  allSelected,
  selectAll,
  toggle,
}: {
  selectAllRef: RefObject<HTMLInputElement | null>;
  visibleStatuses: RootState["ui"]["visibleStatuses"];
  allSelected: boolean;
  selectAll: (selected: boolean) => void;
  toggle: (status: RootState["ui"]["visibleStatuses"][number]) => void;
}) {
  const { t } = useTranslation();
  return (
    <fieldset
      id="status-filter-options"
      className="absolute left-0 top-full z-20 mt-2 w-full min-w-56 rounded-xl border border-line bg-surface p-2 shadow-lg sm:w-64"
    >
      <legend className="sr-only">{t("applications.filterStatuses")}</legend>
      <label className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold hover:bg-accent-hover">
        <input
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={(event) => selectAll(event.target.checked)}
        />
        {t("applications.selectAllStatuses")}
      </label>
      <div className="my-1 border-t border-line" />
      {jobStatuses.map((status) => (
        <label
          key={status}
          className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-accent-hover"
        >
          <input type="checkbox" checked={visibleStatuses.includes(status)} onChange={() => toggle(status)} />
          {getStatusLabel(t, status)}
        </label>
      ))}
    </fieldset>
  );
}
