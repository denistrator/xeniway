import { ApplicationActivitySection } from "../../activity/application-activity-section.tsx";
import { ContactsSection } from "../contacts/contacts-section.tsx";
import { FollowUpsSection } from "../follow-ups/follow-ups-section.tsx";
import { ApplicationLifecycleActions } from "../lifecycle/application-lifecycle-actions.tsx";
import { ApplicationDetailsSection } from "../overview/application-details-section.tsx";
import { ApplicationUnsavedWarning } from "../overview/application-unsaved-warning.tsx";
import { ApplicationWorkspaceHeader } from "../overview/application-workspace-header.tsx";
import { PreparationSection } from "../preparation/preparation-section.tsx";
import { applicationWorkspaceContentStyles } from "./application-workspace-content.styles.ts";
import {
  type ApplicationWorkspaceContentProps,
  useApplicationWorkspaceContent,
} from "./application-workspace-content.ts";

const styles = applicationWorkspaceContentStyles();
export function ApplicationWorkspaceContent(props: ApplicationWorkspaceContentProps) {
  const view = useApplicationWorkspaceContent(props);

  return (
    <div className={view.slotClasses.root}>
      <ApplicationWorkspaceHeader
        application={view.application}
        fields={view.applicationFields}
        actions={<ApplicationLifecycleActions application={view.application} />}
      />
      <div className={styles.columns()}>
        <div className={styles.details()}>
          <ApplicationDetailsSection fields={view.applicationFields} />
          <ApplicationUnsavedWarning fields={view.applicationFields} />
          <PreparationSection applicationId={view.application.id} preparation={view.preparation} />
          <ContactsSection applicationId={view.application.id} contacts={view.contacts} />
          <FollowUpsSection applicationId={view.application.id} tasks={view.followUpTasks} />
        </div>
        <ApplicationActivitySection
          applicationId={view.application.id}
          events={view.events}
          className={styles.activity()}
        />
      </div>
    </div>
  );
}
