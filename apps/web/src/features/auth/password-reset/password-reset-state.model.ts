import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
export type PasswordResetStateProps = { submitted: boolean };

export function usePasswordResetState(submitted: boolean) {
  const { t } = useTranslation();
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (submitted) {
      descriptionRef.current?.focus();
    }
  }, [submitted]);

  const labels = {
    successTitle: t("auth.resetPassword.successTitle"),
    successDescription: t("auth.resetPassword.successDescription"),
    returnToSignIn: t("auth.forgotPassword.returnToSignIn"),
    unavailableTitle: t("auth.resetPassword.unavailableTitle"),
    unavailableDescription: t("auth.resetPassword.unavailableDescription"),
    requestNewLink: t("auth.resetPassword.requestNewLink"),
  };

  return { labels, descriptionRef };
}
