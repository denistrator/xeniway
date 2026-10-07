import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.tsx";
import { passwordResetStateStyles } from "./password-reset-state.styles.ts";
import { type PasswordResetStateProps, usePasswordResetState } from "./password-reset-state.ts";

const styles = passwordResetStateStyles();

export function PasswordResetState({ submitted }: PasswordResetStateProps) {
  const { labels } = usePasswordResetState();
  return submitted ? (
    <AuthCard title={labels.successTitle} description={labels.successDescription}>
      <Link className={styles.signInLink()} to="/login">
        {labels.returnToSignIn}
      </Link>
    </AuthCard>
  ) : (
    <AuthCard title={labels.unavailableTitle} description={labels.unavailableDescription}>
      <Link className={styles.requestLink()} to="/forgot-password">
        {labels.requestNewLink}
      </Link>
    </AuthCard>
  );
}
