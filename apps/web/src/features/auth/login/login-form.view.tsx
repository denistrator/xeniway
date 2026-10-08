import { LockKeyhole, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button.view";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type LoginFormProps, useLoginForm } from "./login-form.model";
import { loginFormStyles } from "./login-form.styles";

const styles = loginFormStyles();

export function LoginForm({
  email,
  password,
  error,
  pending,
  errorRef,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: LoginFormProps) {
  const { labels, hasError, handleEmailChange, handlePasswordChange, submitLabel } = useLoginForm({
    error,
    pending,
    onEmailChange,
    onPasswordChange,
  });
  return (
    <form className={styles.form()} onSubmit={onSubmit}>
      <FloatingLabel htmlFor="login-email" label={labels.email} icon={Mail}>
        <Input
          id="login-email"
          className={styles.emailInput()}
          name="email"
          autoComplete="email"
          spellCheck={false}
          placeholder=" "
          required
          type="email"
          value={email}
          onChange={handleEmailChange}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="login-password" label={labels.password} icon={LockKeyhole}>
        <Input
          id="login-password"
          className={styles.passwordInput()}
          name="password"
          autoComplete="current-password"
          placeholder=" "
          required
          type="password"
          value={password}
          onChange={handlePasswordChange}
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
      <p className={styles.forgotPasswordPrompt()}>
        <Link className={styles.forgotPasswordLink()} to="/forgot-password">
          {labels.forgotPassword}
        </Link>
      </p>
    </form>
  );
}
