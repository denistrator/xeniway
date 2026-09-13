import { LockKeyhole, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { FloatingLabel } from "../../../components/ui/floating-label";
import { Input } from "../../../components/ui/input";
import type { RegisterFormState } from "./register-form";

export function RegisterFields({
  form,
  onChange,
}: {
  form: RegisterFormState;
  onChange: (field: keyof RegisterFormState, value: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <FloatingLabel htmlFor="register-first-name" label={t("auth.fields.firstName")} icon={User}>
          <Input
            id="register-first-name"
            className="peer"
            name="firstName"
            autoComplete="given-name"
            placeholder=" "
            value={form.firstName}
            onChange={(event) => onChange("firstName", event.target.value)}
          />
        </FloatingLabel>
        <FloatingLabel htmlFor="register-last-name" label={t("auth.fields.lastName")} icon={User}>
          <Input
            id="register-last-name"
            className="peer"
            name="lastName"
            autoComplete="family-name"
            placeholder=" "
            value={form.lastName}
            onChange={(event) => onChange("lastName", event.target.value)}
          />
        </FloatingLabel>
      </div>
      <FloatingLabel htmlFor="register-email" label={t("auth.fields.email")} icon={Mail}>
        <Input
          id="register-email"
          className="peer"
          name="email"
          autoComplete="email"
          spellCheck={false}
          placeholder=" "
          required
          type="email"
          value={form.email}
          onChange={(event) => onChange("email", event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="register-password" label={t("auth.fields.password")} icon={LockKeyhole}>
        <Input
          id="register-password"
          className="peer"
          name="password"
          autoComplete="new-password"
          placeholder=" "
          required
          type="password"
          value={form.password}
          onChange={(event) => onChange("password", event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="register-confirm-password" label={t("auth.fields.confirmPassword")} icon={LockKeyhole}>
        <Input
          id="register-confirm-password"
          className="peer"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder=" "
          required
          type="password"
          value={form.confirmPassword}
          onChange={(event) => onChange("confirmPassword", event.target.value)}
        />
      </FloatingLabel>
    </>
  );
}
