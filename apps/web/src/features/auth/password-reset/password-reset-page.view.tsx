import { AuthCard } from "../../../components/auth-card.view";
import { PasswordResetForm } from "./password-reset-form.view";
import { usePasswordResetPage } from "./password-reset-page.model";
import { PasswordResetState } from "./password-reset-state.view";

export { getResetToken } from "./password-reset-page.model";

export function PasswordResetPage() {
  const {
    labels,
    errorRef,
    error,
    showState,
    password,
    setPassword,
    passwordConfirmation,
    setPasswordConfirmation,
    submitted,
    handleSubmit,
    pending,
  } = usePasswordResetPage();
  if (showState) {
    return <PasswordResetState submitted={submitted} />;
  }
  return (
    <AuthCard title={labels.title} description={labels.description}>
      <PasswordResetForm
        password={password}
        confirmation={passwordConfirmation}
        error={error}
        pending={pending}
        errorRef={errorRef}
        onPasswordChange={setPassword}
        onConfirmationChange={setPasswordConfirmation}
        onSubmit={handleSubmit}
      />
    </AuthCard>
  );
}
