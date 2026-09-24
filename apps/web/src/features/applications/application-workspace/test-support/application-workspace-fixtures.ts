import type {
  ApplicationContact,
  ApplicationDetailResponse,
  ApplicationFollowUpTask,
  ApplicationPreparation,
} from "@xeniway/shared";

export const workspacePreparation: ApplicationPreparation = {
  companyResearch: "Existing research",
  talkingPoints: null,
  interviewerQuestions: null,
  updatedAt: null,
};

export const workspaceContact: ApplicationContact = {
  id: 7,
  applicationId: 3,
  name: "Ari Cole",
  role: "Recruiter",
  email: "ari@example.com",
  phone: "+1 212 555 0123",
  profileUrl: "https://example.com/ari",
  notes: "Hiring team",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

export const workspaceFollowUpTask: ApplicationFollowUpTask = {
  id: 8,
  applicationId: 3,
  title: "Write to Ari",
  dueDate: "2026-09-26",
  notes: null,
  completedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

export function createApplicationWorkspaceData(
  overrides: Partial<ApplicationDetailResponse["data"]> = {},
): ApplicationDetailResponse["data"] {
  return {
    application: {
      id: 3,
      company: "Northwind",
      position: "Engineer",
      status: "saved",
      location: null,
      salary: null,
      jobUrl: null,
      description: null,
      appliedAt: null,
      notes: null,
      createdAt: "2026-09-01T00:00:00.000Z",
      updatedAt: "2026-09-01T00:00:00.000Z",
      sortOrder: 0,
      archivedAt: null,
      blacklistedAt: null,
      blacklistReason: null,
    },
    events: [],
    preparation: workspacePreparation,
    contacts: [],
    followUpTasks: [],
    ...overrides,
  };
}
