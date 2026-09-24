import type { ApplicationDetailResponse } from "@xeniway/shared";
import { ApplicationActivitySection } from "../../activity/application-activity-section";
import { ContactsSection } from "../contacts/contacts-section";
import { FollowUpsSection } from "../follow-ups/follow-ups-section";
import { ApplicationLifecycleActions } from "../lifecycle/application-lifecycle-actions";
import { ApplicationDetailsSection } from "../overview/application-details-section";
import { ApplicationUnsavedWarning } from "../overview/application-unsaved-warning";
import { ApplicationWorkspaceHeader } from "../overview/application-workspace-header";
import { useApplicationFields } from "../overview/use-application-fields";
import { PreparationSection } from "../preparation/preparation-section";

export function ApplicationWorkspaceContent({ data }: { data: ApplicationDetailResponse["data"] }) {
  const { application, contacts, events, followUpTasks, preparation } = data;
  const applicationFields = useApplicationFields(application);

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-4 pb-12 sm:px-6">
      <ApplicationWorkspaceHeader
        application={application}
        fields={applicationFields}
        actions={<ApplicationLifecycleActions application={application} />}
      />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.7fr)]">
        <div className="space-y-5">
          <ApplicationDetailsSection fields={applicationFields} />
          <ApplicationUnsavedWarning fields={applicationFields} />
          <PreparationSection applicationId={application.id} preparation={preparation} />
          <ContactsSection applicationId={application.id} contacts={contacts} />
          <FollowUpsSection applicationId={application.id} tasks={followUpTasks} />
        </div>
        <ApplicationActivitySection applicationId={application.id} events={events} />
      </div>
    </div>
  );
}
