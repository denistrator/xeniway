import { Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { AuthCard } from "../../../components/auth-card.tsx";
import { Button } from "../../../components/ui/button.tsx";
import { FloatingLabel } from "../../../components/ui/floating-label.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { forgotPasswordPageStyles } from "./forgot-password-page.styles.ts";
import { useForgotPasswordPage } from "./forgot-password-page.ts";

const styles = forgotPasswordPageStyles();

export function ForgotPasswordPage() {
  const { labels, errorRef, email, submitted, request, handleSubmit, handleEmailChange, pending, submitLabel } =
    useForgotPasswordPage();
  return (
    <AuthCard title={labels.title} description={labels.description}>
      {submitted ? (
        <div className={styles.success()} role="status" aria-live="polite">
          <p className={styles.successMessage()}>{labels.submitted}</p>
          <Link className={styles.returnLink()} to="/login">
            {labels.returnToSignIn}
          </Link>
        </div>
      ) : (
        <form className={styles.form()} onSubmit={handleSubmit}>
          <FloatingLabel htmlFor="forgot-password-email" label={labels.email} icon={Mail}>
            <Input
              id="forgot-password-email"
              className={styles.emailInput()}
              name="email"
              type="email"
              autoComplete="email"
              spellCheck={false}
              placeholder=" "
              required
              value={email}
              onChange={handleEmailChange}
            />
          </FloatingLabel>
          {request.error && (
            <p ref={errorRef} role="alert" aria-live="assertive" tabIndex={-1} className={styles.error()}>
              {labels.error}
            </p>
          )}
          <Button className={styles.submitButton()} type="submit" disabled={pending}>
            {submitLabel}
          </Button>
          <p className={styles.signInPrompt()}>
            {labels.rememberedPassword}{" "}
            <Link className={styles.signInLink()} to="/login">
              {labels.signIn}
            </Link>
          </p>
        </form>
      )}
    </AuthCard>
  );
}
