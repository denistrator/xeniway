import { z } from "zod";

export const jobStatusSchema = z.enum(["saved", "applied", "interview", "offer", "rejected", "withdrawn"]);

export const supportedLocaleSchema = z.enum(["en", "ru", "uk", "he"]);
export const themePreferenceSchema = z.enum(["light", "dark", "system"]);
export const formPresentationSchema = z.enum(["drawer", "modal"]);
export const applicationBoardSchema = z.enum(["active", "archive", "blacklist"]);
export type ApplicationBoard = z.infer<typeof applicationBoardSchema>;

export type JobStatus = z.infer<typeof jobStatusSchema>;

export const manualApplicationEventTypeSchema = z.enum([
  "note",
  "email_sent",
  "email_received",
  "phone_call",
  "interview_scheduled",
  "interview_completed",
  "offer_received",
  "rejection_received",
  "follow_up",
  "custom",
]);
export const applicationEventTypeSchema = z.enum([
  "application_created",
  "application_edited",
  "status_changed",
  "archived",
  "restored_from_archive",
  "blacklisted",
  "restored_from_blacklist",
  ...manualApplicationEventTypeSchema.options,
]);
export type ApplicationEventType = z.infer<typeof applicationEventTypeSchema>;

export const applicationEventInputSchema = z.strictObject({
  type: manualApplicationEventTypeSchema,
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(10_000).nullable().optional(),
  occurredAt: z.iso.datetime({ offset: true }),
});
export const updateApplicationEventInputSchema = applicationEventInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: "At least one event field must be provided" });
export type ApplicationEventInput = z.infer<typeof applicationEventInputSchema>;
export type UpdateApplicationEventInput = z.infer<typeof updateApplicationEventInputSchema>;

export type ApplicationEvent = {
  id: number;
  applicationId: number;
  type: ApplicationEventType;
  title: string;
  description: string | null;
  occurredAt: string;
  createdAt: string;
  updatedAt: string;
  metadata: { from: JobStatus; to: JobStatus } | null;
  isSystem: boolean;
};

const preparationFields = {
  companyResearch: z.string().trim().max(10_000).nullable(),
  talkingPoints: z.string().trim().max(10_000).nullable(),
  interviewerQuestions: z.string().trim().max(10_000).nullable(),
};

export const updateApplicationPreparationInputSchema = z
  .strictObject(preparationFields)
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: "At least one preparation field must be provided" });

export type UpdateApplicationPreparationInput = z.infer<typeof updateApplicationPreparationInputSchema>;

export const createApplicationContactInputSchema = z.strictObject({
  name: z.string().trim().min(1).max(255),
  role: z.string().trim().min(1).max(255),
  email: z.string().trim().email().max(255).nullable().optional(),
  phone: z.string().trim().max(100).nullable().optional(),
  profileUrl: z
    .string()
    .trim()
    .url()
    .max(500)
    .refine((value) => ["http:", "https:"].includes(new URL(value).protocol), {
      message: "Profile URL must use HTTP or HTTPS",
    })
    .nullable()
    .optional(),
  notes: z.string().trim().max(10_000).nullable().optional(),
});

export const updateApplicationContactInputSchema = createApplicationContactInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: "At least one contact field must be provided" });

export type CreateApplicationContactInput = z.infer<typeof createApplicationContactInputSchema>;
export type UpdateApplicationContactInput = z.infer<typeof updateApplicationContactInputSchema>;

export const createApplicationFollowUpTaskInputSchema = z.strictObject({
  title: z.string().trim().min(1).max(255),
  dueDate: z.iso.date(),
  notes: z.string().trim().max(10_000).nullable().optional(),
});

export const updateApplicationFollowUpTaskInputSchema = createApplicationFollowUpTaskInputSchema
  .partial()
  .refine((input) => Object.keys(input).length > 0, { message: "At least one follow-up field must be provided" });

export type CreateApplicationFollowUpTaskInput = z.infer<typeof createApplicationFollowUpTaskInputSchema>;
export type UpdateApplicationFollowUpTaskInput = z.infer<typeof updateApplicationFollowUpTaskInputSchema>;

export type ApplicationPreparation = {
  companyResearch: string | null;
  talkingPoints: string | null;
  interviewerQuestions: string | null;
  updatedAt: string | null;
};

export type ApplicationContact = {
  id: number;
  applicationId: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  profileUrl: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ApplicationFollowUpTask = {
  id: number;
  applicationId: number;
  title: string;
  dueDate: string;
  notes: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

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
export const removeAllApplicationsInputSchema = z.object({ board: applicationBoardSchema });
export type RemoveAllApplicationsInput = z.infer<typeof removeAllApplicationsInputSchema>;
export type RegisterInput = z.infer<typeof registerInputSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestInputSchema>;
export type PasswordResetConfirmInput = z.infer<typeof passwordResetConfirmInputSchema>;
export type SupportedLocale = z.infer<typeof supportedLocaleSchema>;
export type ThemePreference = z.infer<typeof themePreferenceSchema>;
export type FormPresentation = z.infer<typeof formPresentationSchema>;

export const updateUserPreferencesInputSchema = z
  .object({
    selectedLanguage: supportedLocaleSchema.nullable().optional(),
    selectedTheme: themePreferenceSchema.nullable().optional(),
    selectedFormPresentation: formPresentationSchema.nullable().optional(),
  })
  .refine(
    (value) =>
      value.selectedLanguage !== undefined ||
      value.selectedTheme !== undefined ||
      value.selectedFormPresentation !== undefined,
    {
      message: "At least one preference must be provided",
    },
  );

export type UpdateUserPreferencesInput = z.infer<typeof updateUserPreferencesInputSchema>;

export type User = {
  id: number;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
};

export type UserPreferences = {
  wasIntroduced: boolean;
  selectedLanguage: SupportedLocale | null;
  selectedTheme: ThemePreference | null;
  selectedFormPresentation: FormPresentation | null;
  createdAt: string;
  updatedAt: string;
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
export type UserPreferencesResponse = ApiSuccess<{ preferences: UserPreferences }>;
export type ApplicationResponse = ApiSuccess<{ application: JobApplication }>;
export type ApplicationDetailResponse = ApiSuccess<{
  application: JobApplication;
  events: ApplicationEvent[];
  preparation: ApplicationPreparation;
  contacts: ApplicationContact[];
  followUpTasks: ApplicationFollowUpTask[];
}>;
export type ApplicationPreparationResponse = ApiSuccess<{ preparation: ApplicationPreparation }>;
export type ApplicationContactResponse = ApiSuccess<{ contact: ApplicationContact }>;
export type ApplicationFollowUpTaskResponse = ApiSuccess<{ followUpTask: ApplicationFollowUpTask }>;
export type ApplicationEventResponse = ApiSuccess<{ event: ApplicationEvent }>;
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
