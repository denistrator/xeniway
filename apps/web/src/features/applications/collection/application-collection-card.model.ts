import type { JobApplication } from "@xeniway/shared";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { getStatusLabel } from "../board/job-status";

export type ApplicationCollectionCardProps = {
  job: JobApplication;
  details: ReactNode;
  restoreLabel: ReactNode;
  deleteLabel: ReactNode;
  onRestore: () => void;
  onDelete: () => void;
  busy: boolean;
};

export function useApplicationCollectionCardPresentation({ job }: ApplicationCollectionCardProps) {
  const { t } = useTranslation();
  const [activityOpen, setActivityOpen] = useState(false);
  const statusLabel = t("applications.blacklist.status", { status: getStatusLabel(t, job.status) });
  const workspacePath = `/applications/${job.id}`;
  const openLabel = t("applications.workspace.open");
  const activityId = `application-activity-${job.id}`;
  const toggleActivity = () => setActivityOpen((open) => !open);
  const activityLabel = t(activityOpen ? "applications.activity.hide" : "applications.activity.view");
  return {
    activityOpen,
    statusLabel,
    workspacePath,
    openLabel,
    activityId,
    toggleActivity,
    activityLabel,
  };
}
