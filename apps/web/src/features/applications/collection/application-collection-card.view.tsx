import { Link } from "react-router-dom";
import { Card, CardContent } from "../../../components/ui/card.view";
import { ApplicationActivity } from "../activity/application-activity.view";
import { ApplicationCollectionActions } from "./application-collection-actions.view";
import {
  type ApplicationCollectionCardProps,
  useApplicationCollectionCardPresentation,
} from "./application-collection-card.model";
import { applicationCollectionCardStyles } from "./application-collection-card.styles";

const styles = applicationCollectionCardStyles();

export function ApplicationCollectionCard({
  job,
  details,
  restoreLabel,
  deleteLabel,
  onRestore,
  onDelete,
  busy,
}: ApplicationCollectionCardProps) {
  const { activityOpen, statusLabel, workspacePath, openLabel, activityId, toggleActivity, activityLabel } =
    useApplicationCollectionCardPresentation({ job, details, restoreLabel, deleteLabel, onRestore, onDelete, busy });

  return (
    <Card>
      <CardContent className={styles.content()}>
        <div className={styles.summary()}>
          <h2 className={styles.company()}>{job.company}</h2>
          <p className={styles.position()}>{job.position}</p>
          {job.location && <p className={styles.location()}>{job.location}</p>}
          <p className={styles.status()}>{statusLabel}</p>
          <Link className={styles.workspaceLink()} to={workspacePath}>
            {openLabel}
          </Link>
          {details}
        </div>
        <ApplicationCollectionActions
          restoreLabel={restoreLabel}
          deleteLabel={deleteLabel}
          onRestore={onRestore}
          onDelete={onDelete}
          busy={busy}
        />
        <button
          type="button"
          aria-expanded={activityOpen}
          aria-controls={activityId}
          className={styles.activityButton()}
          onClick={toggleActivity}
        >
          {activityLabel}
        </button>
        {activityOpen && (
          <div className={styles.activityContent()} id={activityId}>
            <ApplicationActivity applicationId={job.id} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
