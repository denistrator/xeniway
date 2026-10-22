import type { ApplicationDetailResponse } from "@xeniway/shared";
import { useDirtyEditor } from "../../../../lib/dirty-editors";
import { jobStatusStyles } from "../../board/job-status-styles";
import { useApplicationFields } from "../overview/use-application-fields";
import { applicationWorkspaceContentStyles } from "./application-workspace-content.styles";

const styles = applicationWorkspaceContentStyles();

export type ApplicationWorkspaceContentProps = { data: ApplicationDetailResponse["data"] };
export function useApplicationWorkspaceContent({ data }: ApplicationWorkspaceContentProps) {
  const { application, contacts, events, followUpTasks, preparation } = data;
  const applicationFields = useApplicationFields(application);
  useDirtyEditor({
    id: `application-${application.id}`,
    dirty: applicationFields.departure.dirty,
    pending: applicationFields.departure.pending,
    onDepartureBlocked: applicationFields.departure.onDepartureBlocked,
    discard: applicationFields.departure.discard,
    save: applicationFields.departure.save,
  });
  const slotClasses = { root: styles.root({ className: jobStatusStyles({ status: application.status }).workspace() }) };

  return { slotClasses, application, applicationFields, preparation, contacts, followUpTasks, events };
}
