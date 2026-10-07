import { Button } from "../../../components/ui/button.tsx";
import { statusFilterStyles } from "./status-filter.styles.ts";
import { useStatusFilterPresentation } from "./status-filter.ts";
import { StatusFilterOptions } from "./status-filter-options.tsx";

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
