import { Fragment } from "react";
import { jobBoardColumnStyles } from "./job-board-column.styles.ts";
import {
  type DropPlaceholderProps,
  type DropTargetItemProps,
  type JobBoardColumnProps,
  useDropPlaceholderPresentation,
  useDropTargetItemPresentation,
  useJobBoardColumnPresentation,
} from "./job-board-column.ts";
import { JobCard } from "./job-card.tsx";

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
    columnName,
    statusLabel,
    dropBeforeJob,
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
        <h2 className={styles.heading()}>{statusLabel}</h2>
        <span className={styles.count()}>{columnJobs.length}</span>
      </div>
      <ul className={styles.list()}>
        {columnJobs.map((job, index) => (
          <Fragment key={job.id}>
            {dropTarget?.status === status && dropTarget.index === index && (
              <DropPlaceholder status={status} targetId={job.id} onDrop={dropBeforeJob(job)} />
            )}
            <DropTargetItem
              status={status}
              index={index}
              targetId={job.id}
              onDrop={onJobDrop}
              onDragEnter={enterDropTarget(index)}
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
          </Fragment>
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

function DropTargetItem({ status, index, targetId, jobs, onDrop, onDragEnter, children }: DropTargetItemProps) {
  const styles = jobBoardColumnStyles({ status });
  const { itemRef } = useDropTargetItemPresentation({ status, index, targetId, jobs, onDrop, onDragEnter, children });

  return (
    <li className={styles.dropItem()} ref={itemRef}>
      {children}
    </li>
  );
}

function DropPlaceholder({ status, targetId, onDrop }: DropPlaceholderProps) {
  const styles = jobBoardColumnStyles({ status });
  const { placeholderRef } = useDropPlaceholderPresentation({ status, targetId, onDrop });

  return <li ref={placeholderRef} aria-hidden="true" className={styles.placeholder()} />;
}
