import { Link } from "react-router-dom";
import { InfoMessage } from "../../../components/ui/info-message.view";
import { type JobBoardProps, useJobBoardPresentation } from "./job-board.model";
import { jobBoardStyles } from "./job-board.styles";
import { JobBoardColumn } from "./job-board-column.view";

export { jobStatuses } from "./job-status";

const styles = jobBoardStyles();

export function JobBoard({
  jobs,
  onStatusChange,
  onReorder,
  operationError,
  operationSuccess,
  operationSuccessId,
}: JobBoardProps) {
  const {
    board,
    columns,
    moveJob,
    openJob,
    emptyLabel,
    canShowAllStatuses,
    canClearSearch,
    showAllStatuses,
    clearSearch,
    showAllStatusesLabel,
    clearSearchLabel,
    statusNavigationLabel,
    focusStatus,
    operationError: error,
    operationSuccess: success,
    operationSuccessId: successId,
  } = useJobBoardPresentation({
    jobs,
    onStatusChange,
    onReorder,
    operationError,
    operationSuccess,
    operationSuccessId,
  });

  return (
    <div className={styles.root()}>
      {columns.length > 0 && (
        <nav aria-label={statusNavigationLabel} className={styles.statusNavigation()}>
          {columns.map(({ status, label, href }) => (
            <Link key={status} to={href} onClick={focusStatus} className={styles.statusLink()}>
              {label}
            </Link>
          ))}
        </nav>
      )}
      {error && (
        <p role="alert" className={styles.operationError()}>
          {error}
        </p>
      )}
      {success && (
        <InfoMessage messageId={successId ?? success} className={styles.operationSuccess()}>
          {success}
        </InfoMessage>
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
        <div role="status" aria-live="polite" className={styles.emptyMessage()}>
          <p>{emptyLabel}</p>
          {(canShowAllStatuses || canClearSearch) && (
            <div className={styles.emptyActions()}>
              {canShowAllStatuses && (
                <button type="button" className={styles.emptyAction()} onClick={showAllStatuses}>
                  {showAllStatusesLabel}
                </button>
              )}
              {canClearSearch && (
                <button type="button" className={styles.emptyAction()} onClick={clearSearch}>
                  {clearSearchLabel}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
