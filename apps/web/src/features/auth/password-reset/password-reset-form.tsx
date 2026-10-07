import { LockKeyhole } from "lucide-react";
import { Button } from "../../../components/ui/button.tsx";
import { FloatingLabel } from "../../../components/ui/floating-label.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { passwordResetFormStyles } from "./password-reset-form.styles.ts";
import { type PasswordResetFormProps, usePasswordResetForm } from "./password-reset-form.ts";

const styles = passwordResetFormStyles();

export function PasswordResetForm({
  password,
  confirmation,
  error,
  pending,
  errorRef,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
}: PasswordResetFormProps) {
  const { labels, hasError, handlePasswordChange, handleConfirmationChange, submitLabel } = usePasswordResetForm({
    error,
    pending,
    onPasswordChange,
    onConfirmationChange,
  });
  return (
    <form className={styles.form()} onSubmit={onSubmit}>
      <FloatingLabel htmlFor="reset-password" label={labels.newPassword} icon={LockKeyhole}>
        <Input
          id="reset-password"
          className={styles.passwordInput()}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder=" "
          required
          minLength={8}
          value={password}
          onChange={handlePasswordChange}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="reset-password-confirmation" label={labels.confirmPassword} icon={LockKeyhole}>
        <Input
          id="reset-password-confirmation"
          className={styles.confirmationInput()}
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          placeholder=" "
          required
          minLength={8}
          value={confirmation}
          onChange={handleConfirmationChange}
        />
      </FloatingLabel>
      {hasError && (
        <p ref={errorRef} role="alert" aria-live="assertive" tabIndex={-1} className={styles.error()}>
          {labels.error}
        </p>
      )}
      <Button className={styles.submitButton()} type="submit" disabled={pending}>
        {submitLabel}
      </Button>
    </form>
  );
}
