import { useTranslation } from "react-i18next";
import { capabilities } from "./about-page-data";

export function useAboutCapabilities() {
  const { t } = useTranslation();
  return {
    title: t("about.capabilitiesTitle"),
    description: t("about.capabilitiesDescription"),
    capabilities: capabilities.map((id, index) => ({
      id,
      title: t(`about.capability${index + 1}Title`),
      text: t(`about.capability${index + 1}Text`),
    })),
  };
}
