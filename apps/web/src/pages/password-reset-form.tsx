import { LockKeyhole } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { FloatingLabel } from "../components/ui/floating-label";
import { Input } from "../components/ui/input";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";

export function PasswordResetForm({
  password,
  confirmation,
  error,
  pending,
  errorRef,
  onPasswordChange,
  onConfirmationChange,
  onSubmit,
}: {
  password: string;
  confirmation: string;
  error: unknown;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onPasswordChange: (value: string) => void;
  onConfirmationChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FloatingLabel htmlFor="reset-password" label={t("auth.fields.newPassword")} icon={LockKeyhole}>
        <Input
          id="reset-password"
          className="peer"
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder=" "
          required
          minLength={8}
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="reset-password-confirmation" label={t("auth.fields.confirmPassword")} icon={LockKeyhole}>
        <Input
          id="reset-password-confirmation"
          className="peer"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          placeholder=" "
          required
          minLength={8}
          value={confirmation}
          onChange={(event) => onConfirmationChange(event.target.value)}
        />
      </FloatingLabel>
      {Boolean(error) && (
        <p
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="text-sm leading-6 text-rose-600 dark:text-rose-400"
        >
          {error instanceof ApiRequestError ? t(getApiErrorKey(error.code)) : String(error)}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? t("auth.resetPassword.pending") : t("auth.resetPassword.submit")}
      </Button>
    </form>
  );
}
