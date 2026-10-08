import type { ApplicationPreparation } from "@xeniway/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";

import { usePreparationField } from "./use-preparation-field";

export type PreparationSectionProps = {
  applicationId: number;
  preparation: ApplicationPreparation;
};
export function usePreparationSection({ applicationId, preparation }: PreparationSectionProps) {
  const { t } = useTranslation();
  const headingId = useId();
  const companyResearch = usePreparationField(applicationId, "companyResearch", preparation.companyResearch);
  const talkingPoints = usePreparationField(applicationId, "talkingPoints", preparation.talkingPoints);
  const interviewerQuestions = usePreparationField(
    applicationId,
    "interviewerQuestions",
    preparation.interviewerQuestions,
  );
  const fields = [
    {
      key: "companyResearch" as const,
      controller: companyResearch,
      label: t("applications.workspace.preparation.companyResearch"),
    },
    {
      key: "talkingPoints" as const,
      controller: talkingPoints,
      label: t("applications.workspace.preparation.talkingPoints"),
    },
    {
      key: "interviewerQuestions" as const,
      controller: interviewerQuestions,
      label: t("applications.workspace.preparation.interviewerQuestions"),
    },
  ];
  const preparedFields = fields.map((field) => ({
    ...field,
    feedback: field.controller.state
      ? {
          kind: field.controller.state,
          text:
            field.controller.state === "error"
              ? t("applications.workspace.preparation.saveFailedNamed", { name: field.label.toLowerCase() })
              : t("applications.workspace.validation.notesTooLong"),
        }
      : null,
  }));
  const headingLabel = t("applications.workspace.preparation.heading");
  const helpLabel = t("applications.workspace.preparation.help");
  return { headingId, headingLabel, helpLabel, fields: preparedFields, applicationId };
}
