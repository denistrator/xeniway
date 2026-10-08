import { type StatusFilterOptionsProps, useStatusFilterOptionsPresentation } from "./status-filter-options.model";
import { statusFilterOptionsStyles } from "./status-filter-options.styles";

const styles = statusFilterOptionsStyles();

export function StatusFilterOptions({
  selectAllRef,
  visibleStatuses,
  allSelected,
  selectAll,
  toggle,
}: StatusFilterOptionsProps) {
  const { filterStatusesLabel, changeSelectAll, selectAllStatusesLabel, options } = useStatusFilterOptionsPresentation({
    selectAllRef,
    visibleStatuses,
    allSelected,
    selectAll,
    toggle,
  });

  return (
    <fieldset id="status-filter-options" className={styles.root()}>
      <legend className={styles.legend()}>{filterStatusesLabel}</legend>
      <label className={styles.selectAllLabel()}>
        <input
          className={styles.selectAllInput()}
          ref={selectAllRef}
          type="checkbox"
          checked={allSelected}
          onChange={changeSelectAll}
        />
        {selectAllStatusesLabel}
      </label>
      <div className={styles.separator()} />
      {options.map((option) => (
        <label key={option.status} className={styles.statusLabel()}>
          <input className={styles.statusInput()} type="checkbox" checked={option.checked} onChange={option.toggle} />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
