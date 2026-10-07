import { jobBoardStyles } from "./job-board.styles.ts";
import { type JobBoardProps, useJobBoardPresentation } from "./job-board.ts";
import { JobBoardColumn } from "./job-board-column.tsx";

export { jobStatuses } from "./job-status.ts";

const styles = jobBoardStyles();

export function JobBoard({ jobs, onStatusChange, onReorder }: JobBoardProps) {
  const { board, columns, moveJob, openJob, noMatchLabel } = useJobBoardPresentation({
    jobs,
    onStatusChange,
    onReorder,
  });

  return (
    <div className={styles.root()}>
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
