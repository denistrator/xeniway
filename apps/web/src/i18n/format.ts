export function formatDate(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(value));
}

const apiErrorKeys = {
  UNAUTHENTICATED: "errors.unauthenticated",
  INVALID_CREDENTIALS: "errors.invalidCredentials",
  EMAIL_TAKEN: "errors.emailTaken",
  CSRF_ERROR: "errors.csrf",
  VALIDATION_ERROR: "errors.validation",
  RATE_LIMITED: "errors.rateLimited",
  PASSWORD_RESET_RATE_LIMITED: "errors.rateLimited",
  PASSWORD_RESET_INVALID: "errors.passwordResetInvalid",
  PASSWORD_RESET_UNAVAILABLE: "errors.passwordResetUnavailable",
} as const;

export function getApiErrorKey(code: string) {
  return apiErrorKeys[code as keyof typeof apiErrorKeys] ?? "errors.requestFailed";
}
