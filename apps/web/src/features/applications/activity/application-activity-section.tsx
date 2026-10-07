import type { ApplicationEvent } from "@xeniway/shared";
import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { collectionActionStyles } from "../../../components/ui/surface-styles";
import { cn } from "../../../lib/utils";
import { useCanMutate } from "../../offline/offline-access";
import { ApplicationActivityForm } from "./application-activity-form";
import { ApplicationActivityTimeline } from "./application-activity-timeline";
import { useApplicationActivityController } from "./use-application-activity-controller";

export const ApplicationActivitySection = memo(function ApplicationActivitySection({
  applicationId,
  events,
  className,
}: {
  applicationId: number;
  events: ApplicationEvent[];
  className?: string;
}) {
  const { t } = useTranslation();
  const canMutate = useCanMutate();
  const activity = useApplicationActivityController(applicationId);
  const headingId = useId();

  return (
    <section
      tabIndex={-1}
      aria-labelledby={headingId}
      className={cn("mt-6 border-t border-line pt-5 focus-visible:outline-2", className)}
    >
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="workspace-section-title font-display text-lg font-semibold text-ink">
          {t("applications.activity.heading")}
        </h3>
        <button
          ref={activity.addButton}
          type="button"
          disabled={!canMutate}
          className={collectionActionStyles()}
          onClick={activity.beginAdd}
        >
          {t("applications.activity.add")}
        </button>
      </div>
      {activity.editing && (
        <ApplicationActivityForm
          key={activity.editing === "new" ? "new" : activity.editing.id}
          event={activity.editing === "new" ? undefined : activity.editing}
          onSubmit={activity.save}
          onCancel={activity.closeForm}
        />
      )}
      <div className="mt-4" aria-live="polite">
        <ApplicationActivityTimeline events={events} onEdit={activity.beginEdit} onDelete={activity.setDeleting} />
        {activity.deleteError && (
          <p role="alert" className="text-sm text-rose-600">
            {t("applications.activity.deleteFailed")}
          </p>
        )}
      </div>
      {activity.deleting && (
        <ConfirmationModal
          title={t("applications.confirmation.title")}
          text={t("applications.activity.deleteConfirmation")}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            if (canMutate) {
              activity.remove();
            }
          }}
          onNo={activity.cancelDelete}
          yesDisabled={!canMutate || activity.mutations.remove.isPending}
        />
      )}
    </section>
  );
});
