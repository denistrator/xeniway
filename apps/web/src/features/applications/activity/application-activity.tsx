import { useId } from "react";
import { useTranslation } from "react-i18next";
import { collectionActionStyles } from "../../../components/ui/surface-styles";
import { useApplicationDetail } from "../../../lib/queries";
import { useOfflineAccess } from "../../offline/offline-access";
import { ApplicationActivitySection } from "./application-activity-section";

export function ApplicationActivity({ applicationId }: { applicationId: number }) {
  const { t } = useTranslation();
  const detail = useApplicationDetail(applicationId);
  const headingId = useId();
  const access = useOfflineAccess();

  if (detail.data) {
    return <ApplicationActivitySection applicationId={applicationId} events={detail.data.events} />;
  }

  return (
    <section aria-labelledby={headingId} className="mt-6 border-t border-line pt-5">
      <div className="flex items-center justify-between gap-3">
        <h3 id={headingId} className="font-display text-lg font-semibold text-ink">
          {t("applications.activity.heading")}
        </h3>
        <button type="button" aria-disabled="true" className={collectionActionStyles()}>
          {t("applications.activity.add")}
        </button>
      </div>
      <div className="mt-4" aria-live="polite">
        {!access.canReadRemote ? (
          <p className="text-sm text-muted">{t("offline.notDownloaded")}</p>
        ) : detail.isPending ? (
          <p className="text-sm text-muted">{t("common.loading")}</p>
        ) : detail.isError ? (
          <p role="alert" className="text-sm text-rose-600">
            {t("applications.activity.loadFailed")}{" "}
            <button type="button" onClick={() => detail.refetch()}>
              {t("common.actions.retry")}
            </button>
          </p>
        ) : null}
      </div>
    </section>
  );
}
