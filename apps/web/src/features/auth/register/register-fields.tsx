import { LockKeyhole, Mail, User } from "lucide-react";
import { FloatingLabel } from "../../../components/ui/floating-label.tsx";
import { Input } from "../../../components/ui/input.tsx";
import { registerFieldsStyles } from "./register-fields.styles.ts";
import { type RegisterFieldsProps, useRegisterFields } from "./register-fields.ts";

const styles = registerFieldsStyles();

export function RegisterFields({ form, onChange }: RegisterFieldsProps) {
  const {
    labels,
    handleFirstNameChange,
    handleLastNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmationChange,
  } = useRegisterFields(onChange);
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
            onChange={handleFirstNameChange}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="register-last-name" label={labels.lastName} icon={User}>
          <Input
            id="register-last-name"
            className={styles.lastNameInput()}
            name="lastName"
            autoComplete="family-name"
            placeholder=" "
            value={form.lastName}
            onChange={handleLastNameChange}
          />
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
          onChange={handleEmailChange}
        />
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
          onChange={handlePasswordChange}
        />
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
          onChange={handleConfirmationChange}
        />
      </FloatingLabel>
    </>
  );
}
