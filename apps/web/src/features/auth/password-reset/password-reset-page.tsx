import { AuthCard } from "../../../components/auth-card.tsx";
import { PasswordResetForm } from "./password-reset-form.tsx";
import { usePasswordResetPage } from "./password-reset-page.ts";
import { PasswordResetState } from "./password-reset-state.tsx";

export { getResetToken } from "./password-reset-page.ts";

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
