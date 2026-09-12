import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { AuthCard } from "../components/auth-card";

export function PasswordResetState({ submitted }: { submitted: boolean }) {
  const { t } = useTranslation();
  return submitted ? (
    <AuthCard title={t("auth.resetPassword.successTitle")} description={t("auth.resetPassword.successDescription")}>
      <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/login">
        {t("auth.forgotPassword.returnToSignIn")}
      </Link>
    </AuthCard>
  ) : (
    <AuthCard
      title={t("auth.resetPassword.unavailableTitle")}
      description={t("auth.resetPassword.unavailableDescription")}
    >
      <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/forgot-password">
        {t("auth.resetPassword.requestNewLink")}
      </Link>
    </AuthCard>
  );
}
