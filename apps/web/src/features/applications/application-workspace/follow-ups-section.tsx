import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { useId, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "../../../components/ui/card";
import { FollowUpDeleteDialog } from "./follow-up-delete-dialog";
import { FollowUpForm } from "./follow-up-form";
import { FollowUpList } from "./follow-up-list";
import { sortFollowUps } from "./sort-follow-ups";
import { useFollowUpsSection } from "./use-follow-ups-section";
import { useReturnFocus } from "./use-return-focus";
import { WorkspaceSectionHeader } from "./workspace-section-header";
import { WorkspaceStatus } from "./workspace-status";

export function FollowUpsSection({
  applicationId,
  tasks,
}: {
  applicationId: number;
  tasks: ApplicationFollowUpTask[];
}) {
  const { t } = useTranslation();
  const headingId = useId();
  const section = useFollowUpsSection(applicationId);
  const addButton = useRef<HTMLButtonElement>(null);
  const rememberEditorFocus = useReturnFocus(Boolean(section.editing), addButton);
  const rememberConfirmationFocus = useReturnFocus(Boolean(section.deleting), addButton);
  const sorted = sortFollowUps(tasks);
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <WorkspaceSectionHeader
          headingId={headingId}
          title={t("applications.workspace.followUps.heading")}
          help={t("applications.workspace.followUps.help")}
          addLabel={t("applications.workspace.followUps.add")}
          addButton={addButton}
          disabled={Boolean(section.editing)}
          onAdd={(trigger) => {
            rememberEditorFocus(trigger);
            section.setEditing("new");
          }}
        />
        <CardContent>
          {section.editing && (
            <FollowUpForm
              key={section.editing === "new" ? "new" : section.editing.id}
              task={section.editing === "new" ? undefined : section.editing}
              onSave={section.save}
              onCancel={() => section.setEditing(null)}
              pending={section.pending}
            />
          )}
          <FollowUpList
            tasks={sorted}
            pending={section.pending}
            onEdit={(task, trigger) => {
              rememberEditorFocus(trigger);
              section.setEditing(task);
            }}
            onComplete={(id) => void section.complete(id)}
            onDelete={(task, trigger) => {
              rememberConfirmationFocus(trigger);
              section.setEditing(null);
              section.setDeleting(task);
            }}
          />
          <WorkspaceStatus section="followUps" pending={section.pending} status={section.status} />
        </CardContent>
      </Card>
      {section.deleting && (
        <FollowUpDeleteDialog
          task={section.deleting}
          pending={section.pending}
          onDelete={() => void section.remove()}
          onCancel={() => section.setDeleting(null)}
        />
      )}
    </section>
  );
}
