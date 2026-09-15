import { useId } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { ApplicationActivityForm } from "./application-activity-form";
import { ApplicationActivityTimeline } from "./application-activity-timeline";
import { useApplicationActivity } from "./use-application-activity";

export function ApplicationActivity({ applicationId }: { applicationId: number }) {
  const { t } = useTranslation();
  const activity = useApplicationActivity(applicationId);
  const headingId = useId();

  return (
    <section aria-labelledby={headingId} className="mt-6 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg font-semibold text-ink">
          {t("applications.activity.heading")}
        </h3>
        <button
          ref={activity.addButton}
          type="button"
          className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-surface-hover focus-visible:outline-2"
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
        {activity.detail.isPending ? (
          <p className="text-sm text-muted">{t("common.loading")}</p>
        ) : activity.detail.isError ? (
          <p role="alert" className="text-sm text-rose-600">
            {t("applications.activity.loadFailed")}{" "}
            <button type="button" onClick={() => activity.detail.refetch()}>
              {t("common.actions.retry")}
            </button>
          </p>
        ) : (
          <ApplicationActivityTimeline
            events={activity.detail.data.events}
            onEdit={activity.beginEdit}
            onDelete={activity.setDeleting}
          />
        )}
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
          onYes={activity.remove}
          onNo={activity.cancelDelete}
          yesDisabled={activity.mutations.remove.isPending}
        />
      )}
    </section>
  );
}
