import { registerInputSchema } from "@xeniway/shared";
import type { TFunction } from "i18next";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useAuthMutations, useCsrfToken } from "../../../lib/queries";
import { type RegisterFieldErrors, type RegisterFormState, registerError } from "./register-form.model";

const fieldIds: Record<keyof RegisterFormState, string> = {
  firstName: "register-first-name",
  lastName: "register-last-name",
  email: "register-email",
  password: "register-password",
  confirmPassword: "register-confirm-password",
};

function getValidationMessage(
  issue: { code: string; minimum?: number | bigint; maximum?: number | bigint },
  t: TFunction,
) {
  switch (issue.code) {
    case "invalid_format": {
      return t("auth.register.emailInvalid");
    }
    case "too_small": {
      if (issue.minimum === 8) {
        return t("auth.register.passwordTooShort");
      }
      return t("auth.register.required");
    }
    case "too_big": {
      return t("auth.register.tooLong", { max: issue.maximum });
    }
    default: {
      return t("auth.register.checkDetails");
    }
  }
}

function getRegistrationInput(form: RegisterFormState) {
  return {
    ...form,
    firstName: form.firstName || null,
    lastName: form.lastName || null,
  };
}

function getFieldErrors(
  issues: readonly {
    code: string;
    minimum?: number | bigint;
    maximum?: number | bigint;
    path: readonly PropertyKey[];
  }[],
  form: RegisterFormState,
  t: TFunction,
) {
  const errors: RegisterFieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];
    const isKnownField = typeof field === "string" && field in form;
    if (!isKnownField) {
      continue;
    }

    const registerField = field as keyof RegisterFormState;
    if (errors[registerField]) {
      continue;
    }

    errors[registerField] = getValidationMessage(issue, t);
  }

  return errors;
}

export function useRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const csrf = useCsrfToken();
  const { register } = useAuthMutations();
  const [form, setForm] = useState<RegisterFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<RegisterFieldErrors>({});
  const errorRef = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (validationError || register.error) {
      errorRef.current?.focus();
    }
  }, [register.error, validationError]);

  useEffect(() => {
    const firstInvalidField = Object.keys(fieldErrors)[0] as keyof RegisterFormState | undefined;
    if (firstInvalidField) {
      document.getElementById(fieldIds[firstInvalidField])?.focus();
    }
  }, [fieldErrors]);

  function update(field: keyof RegisterFormState, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setFieldErrors((current) => {
      if (!(field in current)) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[field];
      return nextErrors;
    });
  }
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = registerInputSchema.safeParse(getRegistrationInput(form));
    if (!parsed.success) {
      const nextErrors = getFieldErrors(parsed.error.issues, form, t);
      const hasFieldErrors = Object.keys(nextErrors).length > 0;
      setFieldErrors(nextErrors);
      setValidationError(hasFieldErrors ? null : t("auth.register.checkDetails"));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFieldErrors({ confirmPassword: t("auth.register.passwordsMustMatch") });
      setValidationError(null);
      return;
    }
    setFieldErrors({});
    setValidationError(null);
    try {
      await register.mutateAsync(parsed.data);
      navigate("/", { replace: true });
    } catch {
      // The mutation error is rendered in the active registration form.
    }
  }
  const error = validationError ?? (register.error ? registerError(register.error, t) : null);

  const labels = {
    title: t("auth.register.title"),
    description: t("auth.register.description"),
    alreadyRegistered: t("auth.register.alreadyRegistered"),
    signIn: t("auth.login.submit"),
  };

  const pending = csrf.isPending || register.isPending;
  return { labels, errorRef, error, fieldErrors, form, update, handleSubmit, pending };
}
