import { memo } from "react";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal.tsx";
import type { ApplicationActivitySectionProps } from "./application-activity.types";
import { ApplicationActivityForm } from "./application-activity-form.tsx";
import { useApplicationActivitySection } from "./application-activity-section.ts";
import { ApplicationActivityTimeline } from "./application-activity-timeline.tsx";

export const ApplicationActivitySection = memo(function ApplicationActivitySection({
  applicationId,
  events,
  className,
}: ApplicationActivitySectionProps) {
  const activity = useApplicationActivitySection(applicationId, className);
  const styles = activity.styles;
  return (
    <section tabIndex={-1} aria-labelledby={activity.headingId} className={activity.rootClassName}>
      <div className={styles.header()}>
        <h3 id={activity.headingId} className={styles.heading()}>
          {activity.heading}
        </h3>
        <button
          ref={activity.addButton}
          type="button"
          disabled={activity.actionsDisabled}
          className={styles.addButton()}
          onClick={activity.beginAdd}
        >
          {activity.addLabel}
        </button>
      </div>
      {activity.editing && (
        <ApplicationActivityForm
          key={activity.formKey}
          event={activity.editedEvent}
          onSubmit={activity.save}
          onCancel={activity.closeForm}
        />
      )}
      <div className={styles.timeline()} aria-live="polite">
        <ApplicationActivityTimeline events={events} onEdit={activity.beginEdit} onDelete={activity.setDeleting} />
        {activity.deleteError && (
          <p role="alert" className={styles.error()}>
            {activity.deleteErrorLabel}
          </p>
        )}
      </div>
      {activity.deleting && (
        <ConfirmationModal
          title={activity.confirmationTitle}
          text={activity.confirmationText}
          yesLabel={activity.yesLabel}
          noLabel={activity.noLabel}
          onYes={activity.confirmDelete}
          onNo={activity.cancelDelete}
          yesDisabled={activity.deleteDisabled}
        />
      )}
    </section>
  );
});
