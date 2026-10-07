import { parse } from "csv-parse/sync";
import { unzipSync } from "fflate";

export const applicationHeaders = [
  "Company",
  "Position",
  "Status",
  "Board",
  "Location",
  "Job URL",
  "Description",
  "Applied at",
  "Notes",
  "Company research",
  "Talking points",
  "Interviewer questions",
  "Created at",
  "Updated at",
];
export const contactHeaders = ["Application ID", "Name", "Role", "Email", "Phone", "Profile URL", "Notes"];
export const followUpHeaders = ["Application ID", "Title", "Due date", "Notes", "Completed at"];

export function csvRows(text: string): string[][] {
  return parse(text, { bom: true }) as string[][];
}

export function csvRecords(text: string): Record<string, string>[] {
  return parse(text, { bom: true, columns: true }) as Record<string, string>[];
}

export function exportFiles(bytes: Uint8Array): Record<string, string> {
  const decoder = new TextDecoder("utf-8", { ignoreBOM: true });
  return Object.fromEntries(Object.entries(unzipSync(bytes)).map(([name, content]) => [name, decoder.decode(content)]));
}
