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
    read: ({ application }) =>
      application.archivedAt ? "archive" : application.blacklistedAt ? "blacklist" : "active",
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
  const text = value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  const safeText = /^[\s\uFEFF]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replaceAll('"', '""')}"`;
}

export function serializeApplicationsCsv(records: ApplicationExportRecord[]): string {
  const header = exportFields.map((field) => csvCell(field.header)).join(",");
  const rows = records.map((record) => exportFields.map((field) => csvCell(field.read(record))).join(","));

  return `\uFEFF${[header, ...rows].join("\r\n")}\r\n`;
}
