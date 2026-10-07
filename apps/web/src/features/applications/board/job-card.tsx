import { jobCardStyles } from "./job-card.styles.ts";
import { type JobCardProps, useJobCardPresentation } from "./job-card.ts";

export function JobCard({ job, onOpen, onDragStart, onKeyboardMove, position, total }: JobCardProps) {
  const styles = jobCardStyles({ status: job.status });
  const { canMutate, cardRef, handleClick, handleKeyDown, accessibleName, appliedLabel, href } = useJobCardPresentation(
    {
      job,
      onOpen,
      onDragStart,
      onKeyboardMove,
      position,
      total,
    },
  );

  return (
    <a
      href={href}
      ref={cardRef}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-keyshortcuts={canMutate ? "ArrowUp ArrowDown Home End Shift+ArrowLeft Shift+ArrowRight" : undefined}
      aria-label={accessibleName}
      className={styles.root()}
    >
      <div className={styles.header()}>
        <div className={styles.content()}>
          <p className={styles.companyRow()}>
            <span aria-hidden="true" className={styles.marker()} />
            <span className={styles.company()}>{job.company}</span>
          </p>
          <p className={styles.position()}>{job.position}</p>
        </div>
      </div>
      {job.description && <p className={styles.description()}>{job.description}</p>}
      <div className={styles.metadata()}>
        {job.location && <span className={styles.location()}>{job.location}</span>}
        {job.appliedAt && <span className={styles.appliedDate()}>{appliedLabel}</span>}
      </div>
    </a>
  );
}
