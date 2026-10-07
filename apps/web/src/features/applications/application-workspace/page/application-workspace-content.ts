import type { ApplicationDetailResponse } from "@xeniway/shared";
import { jobStatusStyles } from "../../board/job-status-styles.ts";
import { useApplicationFields } from "../overview/use-application-fields.ts";
import { applicationWorkspaceContentStyles } from "./application-workspace-content.styles.ts";

const styles = applicationWorkspaceContentStyles();

export type ApplicationWorkspaceContentProps = { data: ApplicationDetailResponse["data"] };
export function useApplicationWorkspaceContent({ data }: ApplicationWorkspaceContentProps) {
  const { application, contacts, events, followUpTasks, preparation } = data;
  const applicationFields = useApplicationFields(application);
  const slotClasses = { root: styles.root({ className: jobStatusStyles({ status: application.status }).workspace() }) };

  return { slotClasses, application, applicationFields, preparation, contacts, followUpTasks, events };
}
