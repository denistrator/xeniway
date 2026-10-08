import { ApplicationActivitySection } from "../../activity/application-activity-section.view";
import { ContactsSection } from "../contacts/contacts-section.view";
import { FollowUpsSection } from "../follow-ups/follow-ups-section.view";
import { ApplicationLifecycleActions } from "../lifecycle/application-lifecycle-actions.view";
import { ApplicationDetailsSection } from "../overview/application-details-section.view";
import { ApplicationUnsavedWarning } from "../overview/application-unsaved-warning.view";
import { ApplicationWorkspaceHeader } from "../overview/application-workspace-header.view";
import { PreparationSection } from "../preparation/preparation-section.view";
import {
  type ApplicationWorkspaceContentProps,
  useApplicationWorkspaceContent,
} from "./application-workspace-content.model";
import { applicationWorkspaceContentStyles } from "./application-workspace-content.styles";

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
