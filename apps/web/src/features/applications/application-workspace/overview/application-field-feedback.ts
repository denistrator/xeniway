import type { TFunction } from "i18next";
import type { WorkspaceFieldFeedback } from "../shared/workspace-text-field.model";
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
  if (!controller.state) {
    return null;
  }

  let text: string;
  if (controller.state === "error") {
    if (controller.errorKey) {
      text = t(controller.errorKey);
    } else {
      text = t("applications.workspace.saveFailedNamed", { name: label.toLowerCase() });
    }
  } else {
    text = t("applications.form.checkDetails");
  }
  return { kind: controller.state, text };
}
