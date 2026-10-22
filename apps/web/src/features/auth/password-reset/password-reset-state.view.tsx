import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.view";
import { type PasswordResetStateProps, usePasswordResetState } from "./password-reset-state.model";
import { passwordResetStateStyles } from "./password-reset-state.styles";

const styles = passwordResetStateStyles();

export function PasswordResetState({ submitted }: PasswordResetStateProps) {
  const { labels, descriptionRef } = usePasswordResetState(submitted);
  return submitted ? (
    <AuthCard
      title={labels.successTitle}
      description={labels.successDescription}
      descriptionRef={descriptionRef}
      announceDescription
    >
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
