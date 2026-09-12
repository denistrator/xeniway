import type { FormEvent, RefObject } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../components/ui/button";
import { getApiErrorKey } from "../i18n/format";
import { ApiRequestError } from "../lib/api";
import { RegisterFields } from "./register-fields";

export type RegisterFormState = {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function RegisterForm({
  form,
  error,
  pending,
  errorRef,
  onChange,
  onSubmit,
}: {
  form: RegisterFormState;
  error: string | null;
  pending: boolean;
  errorRef: RefObject<HTMLParagraphElement | null>;
  onChange: (field: keyof RegisterFormState, value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { t } = useTranslation();
  return (
    <form className="space-y-4" onSubmit={onSubmit}>
      <RegisterFields form={form} onChange={onChange} />
      {error && (
        <p
          ref={errorRef}
          role="alert"
          aria-live="assertive"
          tabIndex={-1}
          className="text-sm leading-6 text-rose-600 dark:text-rose-400"
        >
          {error}
        </p>
      )}
      <Button className="w-full" type="submit" disabled={pending}>
        {pending ? t("auth.register.pending") : t("auth.register.submit")}
      </Button>
    </form>
  );
}

export function registerError(error: unknown, t: (key: string) => string) {
  return t(getApiErrorKey(error instanceof ApiRequestError ? error.code : "REQUEST_FAILED"));
}
