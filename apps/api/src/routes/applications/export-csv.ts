import type { ApplicationEvent, JobApplication } from "@xeniway/shared";

export type ApplicationExportRecord = {
  application: JobApplication;
  events: ApplicationEvent[];
};

const columns = [
  "company",
  "position",
  "status",
  "board",
  "location",
  "salary",
  "jobUrl",
  "description",
  "appliedAt",
  "notes",
  "blacklistReason",
  "createdAt",
  "updatedAt",
  "archivedAt",
  "blacklistedAt",
  "activity",
] as const;

function csvCell(value: unknown): string {
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  const safeText = /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function serializeApplicationsCsv(records: ApplicationExportRecord[]): string {
  const header = columns.map(csvCell).join(",");
  const rows = records.map(({ application, events }) => {
    const activity = events.map((event) => ({
      type: event.type,
      title: event.title,
      description: event.description,
      occurredAt: event.occurredAt,
      metadata: event.metadata,
      isSystem: event.isSystem,
    }));
    const values = {
      company: application.company,
      position: application.position,
      status: application.status,
      board: application.archivedAt ? "archive" : application.blacklistedAt ? "blacklist" : "active",
      location: application.location,
      salary: application.salary,
      jobUrl: application.jobUrl,
      description: application.description,
      appliedAt: application.appliedAt,
      notes: application.notes,
      blacklistReason: application.blacklistReason,
      createdAt: application.createdAt,
      updatedAt: application.updatedAt,
      archivedAt: application.archivedAt,
      blacklistedAt: application.blacklistedAt,
      activity: JSON.stringify(activity),
    };
    return columns.map((column) => csvCell(values[column])).join(",");
  });

  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}
