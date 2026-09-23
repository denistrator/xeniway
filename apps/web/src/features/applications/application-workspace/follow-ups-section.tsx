import type { ApplicationFollowUpTask } from "@xeniway/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../components/ui/card";
import { ConfirmationModal } from "../../../components/ui/confirmation-modal";
import { FollowUpForm } from "./follow-up-form";
import { FollowUpList } from "./follow-up-list";
import { sortFollowUps } from "./sort-follow-ups";
import { useFollowUpsSection } from "./use-follow-ups-section";
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
  const sorted = sortFollowUps(tasks, section.locallyCompleted);
  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3">
          <div>
            <CardTitle id={headingId} className="font-display text-xl">
              {t("applications.workspace.followUps.heading")}
            </CardTitle>
            <p className="mt-1 text-sm text-muted">{t("applications.workspace.followUps.help")}</p>
          </div>
          {!section.editing && (
            <Button type="button" size="sm" onClick={() => section.setEditing("new")}>
              {t("applications.workspace.followUps.add")}
            </Button>
          )}
        </CardHeader>
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
            locallyCompleted={section.locallyCompleted}
            pending={section.pending}
            onEdit={section.setEditing}
            onComplete={(id) => {
              void section.complete(id);
            }}
            onDelete={section.setDeleting}
          />
          <WorkspaceStatus section="followUps" pending={section.pending} status={section.status} />
        </CardContent>
      </Card>
      {section.deleting && (
        <ConfirmationModal
          title={t("applications.workspace.followUps.deleteTitle")}
          text={t("applications.workspace.followUps.deleteConfirmation", { title: section.deleting.title })}
          yesLabel={t("common.actions.yes")}
          noLabel={t("common.actions.no")}
          onYes={() => {
            void section.remove();
          }}
          onNo={() => section.setDeleting(null)}
          yesDisabled={section.pending}
        />
      )}
    </section>
  );
}
