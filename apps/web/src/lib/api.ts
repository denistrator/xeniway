import type {
  ApiError,
  ApiSuccess,
  ApplicationListResponse,
  ApplicationResponse,
  AuthResponse,
  CreateApplicationInput,
  CsrfResponse,
  CurrentUserResponse,
  JobApplication,
  LoginInput,
  MessageResponse,
  RegisterInput,
  UpdateApplicationInput,
} from "@job-tracker/shared";

export type ApplicationList = "active" | "archive";

export const applicationKeys = {
  all: ["applications"] as const,
  list: (list: ApplicationList) => ["applications", "list", list] as const,
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
      window.dispatchEvent(new Event("job-tracker:auth-expired"));
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

export function getCurrentUser(): Promise<CurrentUserResponse> {
  return requestJson<CurrentUserResponse>("/api/auth/me");
}

export function logout(csrfToken: string): Promise<ApiSuccess<MessageResponse["data"]>> {
  return requestJson<ApiSuccess<MessageResponse["data"]>>("/api/auth/logout", { method: "POST" }, csrfToken);
}

export function listApplications(status?: string): Promise<ApplicationListResponse> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return requestJson<ApplicationListResponse>(`/api/applications${query}`);
}

export function listArchivedApplications(): Promise<ApplicationListResponse> {
  return requestJson<ApplicationListResponse>("/api/applications/archive");
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

export type { JobApplication };
