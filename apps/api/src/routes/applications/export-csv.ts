import type { ApplicationContact, ApplicationFollowUpTask } from "@xeniway/shared";
import type { ApplicationExportRecord } from "../../db/repositories/types";

type CsvExportField = {
  header: string;
  read: (record: ApplicationExportRecord) => string | null;
};

// This ordered allowlist defines both the CSV header and each row's values.
const exportFields: readonly CsvExportField[] = [
  { header: "Company", read: ({ application }) => application.company },
  { header: "Position", read: ({ application }) => application.position },
  { header: "Status", read: ({ application }) => application.status },
  {
    header: "Board",
    read: ({ application }) => {
      if (application.archivedAt) {
        return "archive";
      }
      if (application.blacklistedAt) {
        return "blacklist";
      }
      return "active";
    },
  },
  { header: "Location", read: ({ application }) => application.location },
  { header: "Job URL", read: ({ application }) => application.jobUrl },
  { header: "Description", read: ({ application }) => application.description },
  { header: "Applied at", read: ({ application }) => application.appliedAt },
  { header: "Notes", read: ({ application }) => application.notes },
  { header: "Company research", read: ({ preparation }) => preparation.companyResearch },
  { header: "Talking points", read: ({ preparation }) => preparation.talkingPoints },
  { header: "Interviewer questions", read: ({ preparation }) => preparation.interviewerQuestions },
  { header: "Created at", read: ({ application }) => application.createdAt },
  { header: "Updated at", read: ({ application }) => application.updatedAt },
];

function csvCell(value: unknown): string {
  let text = "";
  if (typeof value === "string") {
    text = value;
  } else if (value != null) {
    text = JSON.stringify(value);
  }
  const safeText = /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

function serializeRows<T>(
  fields: ReadonlyArray<{ header: string; read: (record: T) => string | number | null }>,
  records: T[],
) {
  const header = fields.map((field) => csvCell(field.header)).join(",");
  const rows = records.map((record) => fields.map((field) => csvCell(field.read(record))).join(","));
  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}

export function serializeApplicationsCsv(records: ApplicationExportRecord[]): string {
  return serializeRows(exportFields, records);
}

export function serializeContactsCsv(contacts: ApplicationContact[]): string {
  return serializeRows(
    [
      { header: "Application ID", read: (contact) => contact.applicationId },
      { header: "Name", read: (contact) => contact.name },
      { header: "Role", read: (contact) => contact.role },
      { header: "Email", read: (contact) => contact.email },
      { header: "Phone", read: (contact) => contact.phone },
      { header: "Profile URL", read: (contact) => contact.profileUrl },
      { header: "Notes", read: (contact) => contact.notes },
    ],
    contacts,
  );
}

export function serializeFollowUpsCsv(tasks: ApplicationFollowUpTask[]): string {
  return serializeRows(
    [
      { header: "Application ID", read: (task) => task.applicationId },
      { header: "Title", read: (task) => task.title },
      { header: "Due date", read: (task) => task.dueDate },
      { header: "Notes", read: (task) => task.notes },
      { header: "Completed at", read: (task) => task.completedAt },
    ],
    tasks,
  );
}
