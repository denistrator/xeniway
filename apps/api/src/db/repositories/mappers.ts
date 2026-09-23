import {
  type ApplicationContact,
  type ApplicationEvent,
  type ApplicationFollowUpTask,
  type ApplicationPreparation,
  formPresentationSchema,
  type JobApplication,
  supportedLocaleSchema,
  themePreferenceSchema,
  type User,
  type UserPreferences,
} from "@xeniway/shared";
import type {
  ApplicationContactRow,
  ApplicationEventRow,
  ApplicationFollowUpTaskRow,
  ApplicationWorkspaceRow,
  JobApplicationRow,
  UserPreferencesRow,
  UserRow,
} from "./types";

export function toApplicationPreparation(row: ApplicationWorkspaceRow | null): ApplicationPreparation {
  return {
    companyResearch: row?.companyResearch ?? null,
    talkingPoints: row?.talkingPoints ?? null,
    interviewerQuestions: row?.interviewerQuestions ?? null,
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

export function toApplicationContact(row: ApplicationContactRow): ApplicationContact {
  return {
    id: row.id,
    applicationId: row.applicationId,
    name: row.name,
    role: row.role,
    email: row.email,
    phone: row.phone,
    profileUrl: row.profileUrl,
    notes: row.notes,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function toApplicationFollowUpTask(row: ApplicationFollowUpTaskRow): ApplicationFollowUpTask {
  return {
    id: row.id,
    applicationId: row.applicationId,
    title: row.title,
    dueDate: row.dueDate,
    notes: row.notes,
    completedAt: row.completedAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
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
