import { useTranslation } from "react-i18next";

export function useAboutSecurity() {
  const { t } = useTranslation();
  return {
    securityTitle: t("about.securityTitle"),
    securityOwnership: t("about.securityOwnership"),
    securityCredentials: t("about.securityCredentials"),
    securityAccessibility: t("about.securityAccessibility"),
  };
}
