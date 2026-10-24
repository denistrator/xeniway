import {
  type DropPlaceholderProps,
  type DropTargetItemProps,
  type JobBoardColumnProps,
  useDropTargetItemPresentation,
  useJobBoardColumnPresentation,
} from "./job-board-column.model";
import { jobBoardColumnStyles } from "./job-board-column.styles";
import { JobCard } from "./job-card.view";

export function JobBoardColumn({
  status,
  columnJobs,
  onDrop,
  onJobDrop,
  onDragStart,
  dropTarget,
  setDropTarget,
  onKeyboardMove,
  onOpen,
}: JobBoardColumnProps) {
  const styles = jobBoardColumnStyles({ status });
  const {
    columnRef,
    headingId,
    columnName,
    statusLabel,
    enterDropTarget,
    openJob,
    moveJob,
    startDraggingJob,
    dropHereLabel,
  } = useJobBoardColumnPresentation({
    status,
    columnJobs,
    onDrop,
    onJobDrop,
    onDragStart,
    dropTarget,
    setDropTarget,
    onKeyboardMove,
    onOpen,
  });

  return (
    <section ref={columnRef} aria-label={columnName} className={styles.column()}>
      <div className={styles.header()}>
        <h2 id={headingId} tabIndex={-1} className={styles.heading()}>
          {statusLabel}
        </h2>
        <span className={styles.count()}>{columnJobs.length}</span>
      </div>
      <ul className={styles.list()}>
        {columnJobs.map((job, index) => (
          <DropTargetItem
            key={job.id}
            status={status}
            index={index}
            targetId={job.id}
            onDrop={onJobDrop}
            onDragEnter={enterDropTarget(index)}
            showInsertionMarker={dropTarget?.status === status && dropTarget.index === index}
            jobs={columnJobs}
          >
            <JobCard
              job={job}
              position={index + 1}
              total={columnJobs.length}
              onOpen={openJob(job)}
              onKeyboardMove={moveJob(job)}
              onDragStart={startDraggingJob(job)}
            />
          </DropTargetItem>
        ))}
        {dropTarget?.status === status && dropTarget.index === columnJobs.length && <DropPlaceholder status={status} />}
        {!columnJobs.length && (
          <li className={styles.emptyItem()}>
            <p className={styles.emptyMessage()}>{dropHereLabel}</p>
          </li>
        )}
      </ul>
    </section>
  );
}

function DropTargetItem({
  status,
  index,
  targetId,
  jobs,
  onDrop,
  onDragEnter,
  showInsertionMarker,
  children,
}: DropTargetItemProps) {
  const styles = jobBoardColumnStyles({ status });
  const { itemRef } = useDropTargetItemPresentation({
    status,
    index,
    targetId,
    jobs,
    onDrop,
    onDragEnter,
    showInsertionMarker,
    children,
  });

  return (
    <li className={styles.dropItem()} ref={itemRef}>
      {showInsertionMarker && <span aria-hidden="true" className={styles.insertionMarker()} />}
      {children}
    </li>
  );
}

function DropPlaceholder({ status }: DropPlaceholderProps) {
  const styles = jobBoardColumnStyles({ status });
  return <li aria-hidden="true" className={styles.placeholder()} />;
}
