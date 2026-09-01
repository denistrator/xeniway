import { z } from "zod";

export const jobStatusSchema = z.enum(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

const nullableTrimmedString = z.string().trim().max(500).nullable().optional();

export const createApplicationInputSchema = z.object({
  company: z.string().trim().min(1).max(255),
  position: z.string().trim().min(1).max(255),
  location: nullableTrimmedString,
  salary: nullableTrimmedString,
  jobUrl: z.string().trim().url().max(500).nullable().optional(),
  description: z.string().trim().max(10_000).nullable().optional(),
  status: jobStatusSchema.default("saved"),
  appliedAt: z.string().date().nullable().optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
});

export const updateApplicationInputSchema = createApplicationInputSchema.partial();

export const registerInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(8).max(128),
  firstName: z.string().trim().max(100).nullable().optional(),
  lastName: z.string().trim().max(100).nullable().optional(),
});

export const loginInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
  password: z.string().min(1).max(128),
});

export const statusFilterSchema = jobStatusSchema.optional();

export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;

export type User = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

export type JobApplication = {
  id: number;
  company: string;
  position: string;
  location: string | null;
  salary: string | null;
  jobUrl: string | null;
  description: string | null;
  status: JobStatus;
  appliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
};

export type ApiSuccess<T> = { data: T };

export type ApiError = {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string[]>;
  };
};

export type AuthResponse = ApiSuccess<{ user: User; csrfToken: string }>;
export type CurrentUserResponse = ApiSuccess<{ user: User }>;
export type ApplicationResponse = ApiSuccess<{ application: JobApplication }>;
export type ApplicationListResponse = ApiSuccess<{ applications: JobApplication[] }>;
export type MessageResponse = ApiSuccess<{ message: string }>;
export type CsrfResponse = ApiSuccess<{ csrfToken: string }>;

export type HealthResponse = {
  status: "ok";
  database: "up";
};
