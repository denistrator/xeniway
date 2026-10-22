import type { ChangeEvent } from "react";
import { useTranslation } from "react-i18next";
import type { RegisterFieldErrors, RegisterFormState } from "./register-form.model";
export type RegisterFieldsProps = {
  form: RegisterFormState;
  errors: RegisterFieldErrors;
  onChange: (field: keyof RegisterFormState, value: string) => void;
};

function getFieldError(field: keyof RegisterFormState, errors: RegisterFieldErrors) {
  const error = errors[field];
  const errorId = error ? `register-${field}-error` : undefined;
  const helpId = field === "password" ? "register-password-help" : undefined;
  const describedBy = [helpId, errorId].filter(Boolean).join(" ") || undefined;

  return { error, errorId, describedBy };
}

export function useRegisterFields({ errors, onChange }: Pick<RegisterFieldsProps, "errors" | "onChange">) {
  const { t } = useTranslation();

  const labels = {
    firstName: t("auth.fields.firstName"),
    lastName: t("auth.fields.lastName"),
    email: t("auth.fields.email"),
    password: t("auth.fields.password"),
    confirmPassword: t("auth.fields.confirmPassword"),
    passwordHelp: t("auth.register.passwordHelp"),
  };
  function handleFirstNameChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("firstName", event.target.value);
  }
  function handleLastNameChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("lastName", event.target.value);
  }
  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("email", event.target.value);
  }
  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("password", event.target.value);
  }
  function handleConfirmationChange(event: ChangeEvent<HTMLInputElement>) {
    onChange("confirmPassword", event.target.value);
  }

  return {
    labels,
    handleFirstNameChange,
    handleLastNameChange,
    handleEmailChange,
    handlePasswordChange,
    handleConfirmationChange,
    errors: {
      firstName: getFieldError("firstName", errors),
      lastName: getFieldError("lastName", errors),
      email: getFieldError("email", errors),
      password: getFieldError("password", errors),
      confirmPassword: getFieldError("confirmPassword", errors),
    },
  };
}
