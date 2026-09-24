import type { ApplicationPreparation } from "@xeniway/shared";
import { memo, useId } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { WorkspaceTextField } from "../shared/workspace-text-field";
import { usePreparationField } from "./use-preparation-field";

export const PreparationSection = memo(function PreparationSection({
  applicationId,
  preparation,
}: {
  applicationId: number;
  preparation: ApplicationPreparation;
}) {
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

  return (
    <section aria-labelledby={headingId}>
      <Card>
        <CardHeader>
          <CardTitle id={headingId} className="font-display text-xl">
            {t("applications.workspace.preparation.heading")}
          </CardTitle>
          <p className="text-sm text-muted">{t("applications.workspace.preparation.help")}</p>
        </CardHeader>
        <CardContent className="divide-y divide-line">
          {fields.map(({ key, controller, label }) => (
            <WorkspaceTextField
              key={key}
              id={`${applicationId}-${key}`}
              label={label}
              headingLevel={3}
              className="py-5 first:pt-0 last:pb-0"
              headingClassName="font-display text-lg text-ink"
              controller={controller}
              feedback={
                controller.state
                  ? {
                      kind: controller.state,
                      text:
                        controller.state === "error"
                          ? t("applications.workspace.preparation.saveFailedNamed", { name: label.toLowerCase() })
                          : t("applications.workspace.validation.notesTooLong"),
                    }
                  : null
              }
            />
          ))}
        </CardContent>
      </Card>
    </section>
  );
});
