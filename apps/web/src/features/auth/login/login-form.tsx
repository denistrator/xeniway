import { LockKeyhole, Mail } from "lucide-react";
import type { FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "../../../components/ui/button";
import { FloatingLabel } from "../../../components/ui/floating-label";
import { Input } from "../../../components/ui/input";
import { getApiErrorKey } from "../../../i18n/format";
import { ApiRequestError } from "../../../lib/api";

export function LoginForm({
  email,
  password,
  error,
  pending,
  errorRef,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}: {
  email: string;
  password: string;
  error: unknown;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <FloatingLabel htmlFor="login-email" label={t("auth.fields.email")} icon={Mail}>
        <Input
          id="login-email"
          className="peer"
          name="email"
          autoComplete="email"
          spellCheck={false}
          placeholder=" "
          required
          type="email"
          value={email}
          onChange={(event) => onEmailChange(event.target.value)}
        />
      </FloatingLabel>
      <FloatingLabel htmlFor="login-password" label={t("auth.fields.password")} icon={LockKeyhole}>
        <Input
          id="login-password"
          className="peer"
          name="password"
          autoComplete="current-password"
          placeholder=" "
          required
          type="password"
          value={password}
          onChange={(event) => onPasswordChange(event.target.value)}
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
          {t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"))}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? t("auth.login.pending") : t("auth.login.submit")}
      </Button>
      <p className="text-center text-sm leading-6 text-muted">
        <Link className="font-semibold text-ink underline-offset-4 hover:underline" to="/forgot-password">
          {t("auth.login.forgotPassword")}
        </Link>
      </p>
    </form>
  );
}
