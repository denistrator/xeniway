import { useTranslation } from "react-i18next";

const groups = [
  { id: "boards", titleKey: "title", descriptionKey: "description", items: ["active", "archive", "blacklist"] },
  {
    id: "access",
    titleKey: "accessTitle",
    descriptionKey: "accessDescription",
    items: ["offline", "install", "export"],
  },
] as const;

export function useAboutRecords() {
  const { t } = useTranslation();
  return groups.map((group) => ({
    id: group.id,
    headingId: `about-${group.id}-title`,
    title: t(`about.records.${group.titleKey}`),
    description: t(`about.records.${group.descriptionKey}`),
    items: group.items.map((id) => ({
      id,
      title: t(`about.records.${id}Title`),
      text: t(`about.records.${id}Text`),
    })),
  }));
}
