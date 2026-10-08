import { useTranslation } from "react-i18next";
export type PasswordResetStateProps = { submitted: boolean };

export function usePasswordResetState() {
  const { t } = useTranslation();

  const labels = {
    successTitle: t("auth.resetPassword.successTitle"),
    successDescription: t("auth.resetPassword.successDescription"),
    returnToSignIn: t("auth.forgotPassword.returnToSignIn"),
    unavailableTitle: t("auth.resetPassword.unavailableTitle"),
    unavailableDescription: t("auth.resetPassword.unavailableDescription"),
    requestNewLink: t("auth.resetPassword.requestNewLink"),
  };

  return { labels };
}
