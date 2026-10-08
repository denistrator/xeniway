import { Button } from "../../../components/ui/button.view";
import { useStatusFilterPresentation } from "./status-filter.model";
import { statusFilterStyles } from "./status-filter.styles";
import { StatusFilterOptions } from "./status-filter-options.view";

const styles = statusFilterStyles();

export function StatusFilter() {
  const { filter, toggleOpen, filterStatusesLabel, allStatusesLabel } = useStatusFilterPresentation();

  return (
    <div ref={filter.containerRef} className={styles.root()}>
      <Button
        ref={filter.triggerRef}
        variant="outline"
        className={styles.trigger()}
        aria-haspopup="dialog"
        aria-expanded={filter.open}
        aria-controls="status-filter-options"
        onClick={toggleOpen}
      >
        {filterStatusesLabel}
        <span className={styles.selection()}>{allStatusesLabel}</span>
      </Button>
      {filter.open && <StatusFilterOptions {...filter} />}
    </div>
  );
}
