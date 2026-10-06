import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card";
import { authLinkStyles } from "../auth-styles";

export function PasswordResetState({ submitted }: { submitted: boolean }) {
  const { t } = useTranslation();
  return submitted ? (
    <AuthCard title={t("auth.resetPassword.successTitle")} description={t("auth.resetPassword.successDescription")}>
      <Link className={authLinkStyles()} to="/login">
        {t("auth.forgotPassword.returnToSignIn")}
      </Link>
    </AuthCard>
  ) : (
    <AuthCard
      title={t("auth.resetPassword.unavailableTitle")}
      description={t("auth.resetPassword.unavailableDescription")}
    >
      <Link className={authLinkStyles()} to="/forgot-password">
        {t("auth.resetPassword.requestNewLink")}
      </Link>
    </AuthCard>
  );
}
