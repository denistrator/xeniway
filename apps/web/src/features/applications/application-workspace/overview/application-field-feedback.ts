import type { TFunction } from "i18next";
import type { WorkspaceFieldFeedback } from "../shared/workspace-text-field";
import type { ApplicationFieldController, EditableApplicationField } from "./use-application-field";

const fieldLabelKeys: Record<EditableApplicationField, string> = {
  company: "applications.form.company",
  position: "applications.form.position",
  location: "applications.workspace.location",
  salary: "applications.workspace.salary",
  jobUrl: "applications.workspace.jobUrl",
  description: "applications.workspace.about",
  notes: "applications.workspace.applicationNotes",
  status: "applications.form.status",
  appliedAt: "applications.workspace.appliedAt",
};

export function getApplicationFieldLabel(field: EditableApplicationField, t: TFunction) {
  return t(fieldLabelKeys[field]);
}

export function getApplicationFieldFeedback(
  controller: ApplicationFieldController,
  label: string,
  t: TFunction,
): WorkspaceFieldFeedback {
  if (!controller.state) return null;

  return {
    kind: controller.state,
    text:
      controller.state === "error"
        ? controller.errorKey
          ? t(controller.errorKey)
          : t("applications.workspace.saveFailedNamed", { name: label.toLowerCase() })
        : t("applications.form.checkDetails"),
  };
}
