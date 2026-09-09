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
export const blacklistInputSchema = z.object({
  reason: z.string().trim().max(1000).nullable().optional(),
});

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

export const passwordResetRequestInputSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(255),
});

export const passwordResetConfirmInputSchema = z
  .object({
    token: z.string().trim().min(1).max(512),
    password: z.string().min(8).max(128),
    passwordConfirmation: z.string().min(8).max(128),
  })
  .refine((input) => input.password === input.passwordConfirmation, {
    message: "Passwords do not match",
    path: ["passwordConfirmation"],
  });

export const statusFilterSchema = jobStatusSchema.optional();
export const reorderApplicationsInputSchema = z.object({
  status: jobStatusSchema,
  applicationIds: z.array(z.number().int().positive()).min(1).max(100),
});

export type CreateApplicationInput = z.infer<typeof createApplicationInputSchema>;
export type UpdateApplicationInput = z.infer<typeof updateApplicationInputSchema>;
export type BlacklistInput = z.infer<typeof blacklistInputSchema>;
export type ReorderApplicationsInput = z.infer<typeof reorderApplicationsInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestInputSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmInputSchema>;

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
  sortOrder: number;
  appliedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  blacklistedAt: string | null;
  blacklistReason: string | null;
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

export const PASSWORD_RESET_REQUESTED_MESSAGE =
  "If an account exists for that email, we’ll send password reset instructions.";
export const PASSWORD_RESET_INVALID_ERROR = "PASSWORD_RESET_INVALID";

export type HealthResponse = {
  status: "ok";
  database: "up";
  redis: "up";
};
