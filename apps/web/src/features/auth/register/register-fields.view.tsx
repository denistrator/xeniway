import { LockKeyhole, Mail, User } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.view";
import { Input } from "../../../components/ui/input.view";
import { type RegisterFieldsProps, useRegisterFields } from "./register-fields.model";
import { registerFieldsStyles } from "./register-fields.styles";

const styles = registerFieldsStyles();

export function RegisterFields({ form, errors, onChange }: RegisterFieldsProps) {
  const {
    labels,
    handleFirstNameChange,
    handleLastNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmationChange,
    errors: fieldErrors,
  } = useRegisterFields({ errors, onChange });
  return (
    <>
      <div className={styles.nameFields()}>
        <FloatingLabel htmlFor="register-first-name" label={labels.firstName} icon={User}>
          <Input
            id="register-first-name"
            className={styles.firstNameInput()}
            name="firstName"
            autoComplete="given-name"
            placeholder=" "
            value={form.firstName}
            aria-invalid={fieldErrors.firstName.error ? true : undefined}
            aria-describedby={fieldErrors.firstName.describedBy}
            onChange={handleFirstNameChange}
          />
          {fieldErrors.firstName.error && (
            <p id={fieldErrors.firstName.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.firstName.error}
            </p>
          )}
        </FloatingLabel>
        <FloatingLabel htmlFor="register-last-name" label={labels.lastName} icon={User}>
          <Input
            id="register-last-name"
            className={styles.lastNameInput()}
            name="lastName"
            autoComplete="family-name"
            placeholder=" "
            value={form.lastName}
            aria-invalid={fieldErrors.lastName.error ? true : undefined}
            aria-describedby={fieldErrors.lastName.describedBy}
            onChange={handleLastNameChange}
          />
          {fieldErrors.lastName.error && (
            <p id={fieldErrors.lastName.errorId} role="alert" className={styles.fieldError()}>
              {fieldErrors.lastName.error}
            </p>
          )}
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="register-email" label={labels.email} icon={Mail}>
        <Input
          id="register-email"
          className={styles.emailInput()}
          name="email"
          autoComplete="email"
          spellCheck={false}
          placeholder=" "
          required
          type="email"
          value={form.email}
          aria-invalid={fieldErrors.email.error ? true : undefined}
          aria-describedby={fieldErrors.email.describedBy}
          onChange={handleEmailChange}
        />
        {fieldErrors.email.error && (
          <p id={fieldErrors.email.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.email.error}
          </p>
        )}
      </FloatingLabel>
      <FloatingLabel htmlFor="register-password" label={labels.password} icon={LockKeyhole}>
        <Input
          id="register-password"
          className={styles.passwordInput()}
          name="password"
          autoComplete="new-password"
          placeholder=" "
          required
          type="password"
          value={form.password}
          aria-invalid={fieldErrors.password.error ? true : undefined}
          aria-describedby={fieldErrors.password.describedBy}
          onChange={handlePasswordChange}
        />
        <p id="register-password-help" className={styles.passwordHelp()}>
          {labels.passwordHelp}
        </p>
        {fieldErrors.password.error && (
          <p id={fieldErrors.password.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.password.error}
          </p>
        )}
      </FloatingLabel>
      <FloatingLabel htmlFor="register-confirm-password" label={labels.confirmPassword} icon={LockKeyhole}>
        <Input
          id="register-confirm-password"
          className={styles.confirmationInput()}
          name="confirmPassword"
          autoComplete="new-password"
          placeholder=" "
          required
          type="password"
          value={form.confirmPassword}
          aria-invalid={fieldErrors.confirmPassword.error ? true : undefined}
          aria-describedby={fieldErrors.confirmPassword.describedBy}
          onChange={handleConfirmationChange}
        />
        {fieldErrors.confirmPassword.error && (
          <p id={fieldErrors.confirmPassword.errorId} role="alert" className={styles.fieldError()}>
            {fieldErrors.confirmPassword.error}
          </p>
        )}
      </FloatingLabel>
    </>
  );
}
