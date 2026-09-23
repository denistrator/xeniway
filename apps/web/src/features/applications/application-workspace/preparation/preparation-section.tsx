import type { ApplicationPreparation } from "@xeniway/shared";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import { PreparationField } from "./preparation-field";

export function PreparationSection({
  applicationId,
  preparation,
}: {
  applicationId: number;
  preparation: ApplicationPreparation;
}) {
  const { t } = useTranslation();
  const headingId = useId();
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
          <PreparationField applicationId={applicationId} field="companyResearch" value={preparation.companyResearch} />
          <PreparationField applicationId={applicationId} field="talkingPoints" value={preparation.talkingPoints} />
          <PreparationField
            applicationId={applicationId}
            field="interviewerQuestions"
            value={preparation.interviewerQuestions}
          />
        </CardContent>
      </Card>
    </section>
  );
}
