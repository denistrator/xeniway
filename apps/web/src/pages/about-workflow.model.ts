import { useTranslation } from "react-i18next";

const stages = ["save", "apply", "prepare", "decide"] as const;
const statuses = ["saved", "applied", "interview", "offer", "rejected", "withdrawn"] as const;

export function useAboutWorkflow() {
  const { t } = useTranslation();
  return {
    title: t("about.workflow.title"),
    description: t("about.workflow.description"),
    statusTitle: t("about.workflow.statuses"),
    note: t("about.workflow.note"),
    stages: stages.map((id) => ({
      id,
      title: t(`about.workflow.${id}Title`),
      text: t(`about.workflow.${id}Text`),
    })),
    statuses: statuses.map((id) => ({ id, label: t(`applications.status.${id}`) })),
  };
}
