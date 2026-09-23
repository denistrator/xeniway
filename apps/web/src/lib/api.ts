import type {
  ApiError,
  ApiSuccess,
  ApplicationDetailResponse,
  ApplicationEventInput,
  ApplicationEventResponse,
  ApplicationListResponse,
  ApplicationResponse,
  AuthResponse,
  BlacklistInput,
  CreateApplicationInput,
  CsrfResponse,
  CurrentUserResponse,
  JobApplication,
  JobStatus,
  LoginInput,
  MessageResponse,
  PasswordResetConfirmInput,
  PasswordResetRequestInput,
  RegisterInput,
  RemoveAllApplicationsInput,
  ReorderApplicationsInput,
  UpdateApplicationEventInput,
  UpdateApplicationInput,
  UpdateUserPreferencesInput,
  UserPreferencesResponse,
} from "@xeniway/shared";

export type ApplicationList = "active" | "archive" | "blacklist";

export const applicationKeys = {
  all: ["applications"] as const,
  list: (list: ApplicationList) => ["applications", "list", list] as const,
  detail: (id: number) => ["applications", "detail", id] as const,
};

export const userPreferencesKeys = {
  all: ["user-preferences"] as const,
  current: (userId: number) => ["user-preferences", "current", userId] as const,
};

type ParsedApiError = { code: string; message: string };

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

export function parseApiError(payload: unknown): ParsedApiError {
  if (!payload || typeof payload !== "object") {
    return { code: "REQUEST_FAILED", message: "The request failed" };
  }
  const error = payload as Partial<ApiError>;
  return {
    code: error.error?.code ?? "REQUEST_FAILED",
    message: error.error?.message ?? "The request failed",
  };
}

export async function requestJson<T>(path: string, init: RequestInit = {}, csrfToken?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("content-type")) headers.set("content-type", "application/json");
  if (csrfToken) headers.set("x-csrf-token", csrfToken);

  const response = await fetch(path, { ...init, headers, credentials: "include" });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const error = parseApiError(payload);
    if (response.status === 401 && path.startsWith("/api/applications") && typeof window !== "undefined") {
      window.dispatchEvent(new Event("xeniway:auth-expired"));
    }
    throw new ApiRequestError(error.message, error.code, response.status);
  }
  return payload as T;
}

export function getCsrfToken(): Promise<CsrfResponse> {
  return requestJson<CsrfResponse>("/api/auth/csrf");
}

export function register(input: RegisterInput, csrfToken: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    csrfToken,
  );
}

export function login(input: LoginInput, csrfToken: string): Promise<AuthResponse> {
  return requestJson<AuthResponse>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    csrfToken,
  );
}

export function requestPasswordReset(
  input: PasswordResetRequestInput,
  csrfToken: string,
): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    "/api/auth/password-reset/request",
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function confirmPasswordReset(
  input: PasswordResetConfirmInput,
  csrfToken: string,
): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    "/api/auth/password-reset/confirm",
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return requestJson<CurrentUserResponse>("/api/auth/me");
}

export function getUserPreferences(): Promise<UserPreferencesResponse> {
  return requestJson<UserPreferencesResponse>("/api/user/preferences");
}

export function markUserIntroduced(csrfToken: string): Promise<UserPreferencesResponse> {
  return requestJson<UserPreferencesResponse>("/api/user/preferences/introduced", { method: "POST" }, csrfToken);
}

export function updateUserPreferences(
  input: UpdateUserPreferencesInput,
  csrfToken: string,
  signal?: AbortSignal,
): Promise<UserPreferencesResponse> {
  return requestJson<UserPreferencesResponse>(
    "/api/user/preferences",
    { method: "PATCH", body: JSON.stringify(input), signal },
    csrfToken,
  );
}

export function logout(csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>("/api/auth/logout", { method: "POST" }, csrfToken);
}

export function listApplications(status?: JobStatus): Promise<ApplicationListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return requestJson<ApplicationListResponse>(`/api/applications${query}`);
}

export async function exportApplicationsCsv(): Promise<{ blob: Blob; filename: string }> {
  const path = "/api/applications/export.csv";
  const response = await fetch(path, { credentials: "include" });
  if (!response.ok) {
    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    const error = parseApiError(payload);
    if (response.status === 401 && typeof window !== "undefined") {
      window.dispatchEvent(new Event("xeniway:auth-expired"));
    }
    throw new ApiRequestError(error.message, error.code, response.status);
  }

  const disposition = response.headers.get("content-disposition");
  const filename = disposition?.match(/filename="(xenia-way-export-\d{4}-\d{2}-\d{2}\.csv)"/)?.[1];
  return { blob: await response.blob(), filename: filename ?? "xenia-way-export.csv" };
}

export function getApplicationDetail(id: number): Promise<ApplicationDetailResponse> {
  return requestJson<ApplicationDetailResponse>(`/api/applications/${id}`);
}

export function createApplicationEvent(
  applicationId: number,
  input: ApplicationEventInput,
  csrfToken: string,
): Promise<ApplicationEventResponse> {
  return requestJson<ApplicationEventResponse>(
    `/api/applications/${applicationId}/events`,
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function updateApplicationEvent(
  applicationId: number,
  eventId: number,
  input: UpdateApplicationEventInput,
  csrfToken: string,
): Promise<ApplicationEventResponse> {
  return requestJson<ApplicationEventResponse>(
    `/api/applications/${applicationId}/events/${eventId}`,
    { method: "PATCH", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function deleteApplicationEvent(
  applicationId: number,
  eventId: number,
  csrfToken: string,
): Promise<MessageResponse> {
  return requestJson<MessageResponse>(
    `/api/applications/${applicationId}/events/${eventId}`,
    { method: "DELETE" },
    csrfToken,
  );
}

export function listArchivedApplications(): Promise<ApplicationListResponse> {
  return requestJson<ApplicationListResponse>("/api/applications/archive");
}

export function listBlacklistedApplications(): Promise<ApplicationListResponse> {
  return requestJson<ApplicationListResponse>("/api/applications/blacklist");
}

export function createApplication(input: CreateApplicationInput, csrfToken: string): Promise<ApplicationResponse> {
  return requestJson<ApplicationResponse>(
    "/api/applications",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    csrfToken,
  );
}

export function updateApplication(
  id: number,
  input: UpdateApplicationInput,
  csrfToken: string,
): Promise<ApplicationResponse> {
  return requestJson<ApplicationResponse>(
    `/api/applications/${id}`,
    {
      method: "PUT",
      body: JSON.stringify(input),
    },
    csrfToken,
  );
}

export function reorderApplications(
  input: ReorderApplicationsInput,
  csrfToken: string,
): Promise<ApplicationListResponse> {
  return requestJson<ApplicationListResponse>(
    "/api/applications/reorder",
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function archiveApplication(id: number, csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    `/api/applications/${id}/archive`,
    { method: "POST" },
    csrfToken,
  );
}

export function restoreApplication(id: number, csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    `/api/applications/${id}/restore`,
    { method: "POST" },
    csrfToken,
  );
}

export function deleteApplication(id: number, csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(`/api/applications/${id}`, { method: "DELETE" }, csrfToken);
}

export function removeAllApplications(
  input: RemoveAllApplicationsInput,
  csrfToken: string,
): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    "/api/applications/remove-all",
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function blacklistApplication(
  id: number,
  input: BlacklistInput,
  csrfToken: string,
): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    `/api/applications/${id}/blacklist`,
    { method: "POST", body: JSON.stringify(input) },
    csrfToken,
  );
}

export function unblacklistApplication(id: number, csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>(
    `/api/applications/${id}/unblacklist`,
    { method: "POST" },
    csrfToken,
  );
}

export type { JobApplication };
