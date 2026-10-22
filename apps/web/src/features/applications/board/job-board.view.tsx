import { type JobBoardProps, useJobBoardPresentation } from "./job-board.model";
import { jobBoardStyles } from "./job-board.styles";
import { JobBoardColumn } from "./job-board-column.view";

export { jobStatuses } from "./job-status";

const styles = jobBoardStyles();

export function JobBoard({ jobs, onStatusChange, onReorder, operationError, operationSuccess }: JobBoardProps) {
  const {
    board,
    columns,
    moveJob,
    openJob,
    noMatchLabel,
    operationError: error,
    operationSuccess: success,
  } = useJobBoardPresentation({
    jobs,
    onStatusChange,
    onReorder,
    operationError,
    operationSuccess,
  });

  return (
    <div className={styles.root()}>
      {error && (
        <p role="alert" className={styles.operationError()}>
          {error}
        </p>
      )}
      {success && (
        <p role="status" className={styles.operationSuccess()}>
          {success}
        </p>
      )}
      <div className={styles.columns()}>
        {columns.map(({ status, jobs: columnJobs }) => (
          <JobBoardColumn
            key={status}
            status={status}
            columnJobs={columnJobs}
            onDrop={board.handleColumnDrop}
            onJobDrop={board.handleJobDrop}
            onDragStart={board.handleDragStart}
            dropTarget={board.dropTarget}
            setDropTarget={board.setDropTarget}
            onKeyboardMove={moveJob}
            onOpen={openJob}
          />
        ))}
      </div>
      {!board.filteredJobs.length && (
        <p role="status" aria-live="polite" className={styles.emptyMessage()}>
          {noMatchLabel}
        </p>
      )}
    </div>
  );
}
