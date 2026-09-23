import {
  type ApplicationEvent,
  formPresentationSchema,
  type JobApplication,
  supportedLocaleSchema,
  themePreferenceSchema,
  type User,
  type UserPreferences,
} from "@xeniway/shared";
import type { ApplicationEventRow, JobApplicationRow, UserPreferencesRow, UserRow } from "./types";
export function toUser(row: UserRow): User {
  return {
    id: row.id,
    email: row.email,
    firstName: row.firstName,
    lastName: row.lastName,
    createdAt: row.createdAt.toISOString(),
  };
}

export function toUserPreferences(row: UserPreferencesRow): UserPreferences {
  return {
    wasIntroduced: row.wasIntroduced,
    selectedLanguage: row.selectedLanguage ? supportedLocaleSchema.parse(row.selectedLanguage) : null,
    selectedTheme: row.selectedTheme ? themePreferenceSchema.parse(row.selectedTheme) : null,
    selectedFormPresentation: row.selectedFormPresentation
      ? formPresentationSchema.parse(row.selectedFormPresentation)
      : null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toJobApplication(row: JobApplicationRow): JobApplication {
  return {
    id: row.id,
    company: row.company,
    position: row.position,
    location: row.location,
    salary: row.salary,
    jobUrl: row.jobUrl,
    description: row.description,
    status: row.status,
    sortOrder: row.sortOrder,
    appliedAt: row.appliedAt,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    archivedAt: row.archivedAt?.toISOString() ?? null,
    blacklistedAt: row.blacklistedAt?.toISOString() ?? null,
    blacklistReason: row.blacklistReason,
  };
}

export function toApplicationEvent(row: ApplicationEventRow): ApplicationEvent {
  return {
    id: row.id,
    applicationId: row.applicationId,
    type: row.type,
    title: row.title,
    description: row.description,
    occurredAt: row.occurredAt.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    metadata: row.metadata,
    isSystem: row.isSystem,
  };
}
