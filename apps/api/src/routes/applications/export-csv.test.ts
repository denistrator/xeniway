import type { ApplicationContact, ApplicationFollowUpTask } from "@xeniway/shared";
import { describe, expect, it } from "vitest";
import {
  applicationHeaders,
  contactHeaders,
  csvRecords,
  csvRows,
  followUpHeaders,
} from "../../../../../tests/support/export";
import type { ApplicationExportRecord } from "../../db/repositories/types";
import { serializeApplicationsCsv, serializeContactsCsv, serializeFollowUpsCsv } from "./export-csv";

function applicationRecord(): ApplicationExportRecord {
  return {
    application: {
      id: 17,
      company: "Acme",
      position: "Engineer",
      status: "applied",
      location: "Remote",
      salary: "SECRET SALARY",
      jobUrl: "https://example.com/job",
      description: "Job description",
      appliedAt: "2026-10-01",
      notes: "Application notes",
      sortOrder: 123,
      createdAt: "2026-10-01T10:00:00.000Z",
      updatedAt: "2026-10-02T10:00:00.000Z",
      archivedAt: null,
      blacklistedAt: null,
      blacklistReason: "PRIVATE REASON",
    },
    preparation: { companyResearch: "Research", talkingPoints: "Talking points", interviewerQuestions: "Questions" },
  };
}

function contact(): ApplicationContact {
  return {
    id: 8,
    applicationId: 17,
    name: "Jordan",
    role: "Recruiter",
    email: "jordan@example.com",
    phone: "+123456789",
    profileUrl: "https://example.com/jordan",
    notes: "Contact notes",
    createdAt: "private created",
    updatedAt: "private updated",
  };
}

function followUp(): ApplicationFollowUpTask {
  return {
    id: 9,
    applicationId: 17,
    title: "Send a note",
    dueDate: "2026-10-03",
    notes: "Task notes",
    completedAt: "2026-10-03T10:00:00.000Z",
    createdAt: "private created",
    updatedAt: "private updated",
  };
}

describe("CSV export contract", () => {
  it("maps the complete ordered application allowlist without private fields", () => {
    const csv = serializeApplicationsCsv([applicationRecord()]);
    expect(csvRows(csv)).toEqual([
      applicationHeaders,
      [
        "Acme",
        "Engineer",
        "applied",
        "active",
        "Remote",
        "https://example.com/job",
        "Job description",
        "2026-10-01",
        "Application notes",
        "Research",
        "Talking points",
        "Questions",
        "2026-10-01T10:00:00.000Z",
        "2026-10-02T10:00:00.000Z",
      ],
    ]);
    expect(csv).not.toContain("SECRET SALARY");
    expect(csv).not.toContain("PRIVATE REASON");
  });

  it("maps related records with parent IDs but without contact/task IDs or internal timestamps", () => {
    expect(csvRows(serializeContactsCsv([contact()]))).toEqual([
      contactHeaders,
      ["17", "Jordan", "Recruiter", "jordan@example.com", "'+123456789", "https://example.com/jordan", "Contact notes"],
    ]);
    expect(csvRows(serializeFollowUpsCsv([followUp()]))).toEqual([
      followUpHeaders,
      ["17", "Send a note", "2026-10-03", "Task notes", "2026-10-03T10:00:00.000Z"],
    ]);
  });

  it.each(["active", "archive", "blacklist"] as const)("labels the %s board", (board) => {
    const record = applicationRecord();
    if (board === "archive") {
      record.application.archivedAt = "2026-10-03T00:00:00.000Z";
    }
    if (board === "blacklist") {
      record.application.blacklistedAt = "2026-10-03T00:00:00.000Z";
    }
    expect(csvRecords(serializeApplicationsCsv([record]))[0].Board).toBe(board);
  });

  it.each(["=1+1", "+SUM(A1)", "-1+1", "@SUM(A1)", " \t=1+1", "\r\n+1", "\uFEFF@SUM(A1)"])(
    "neutralizes formula-like text %j in every exported free-text field",
    (value) => {
      const record = applicationRecord();
      record.application.company = value;
      record.application.position = value;
      record.application.location = value;
      record.application.jobUrl = value;
      record.application.description = value;
      record.application.notes = value;
      record.preparation = { companyResearch: value, talkingPoints: value, interviewerQuestions: value };
      const exported = csvRecords(serializeApplicationsCsv([record]))[0];
      for (const field of [
        "Company",
        "Position",
        "Location",
        "Job URL",
        "Description",
        "Notes",
        "Company research",
        "Talking points",
        "Interviewer questions",
      ]) {
        expect(exported[field]).toBe(`'${value}`);
      }
      const related = contact();
      Object.assign(related, { name: value, role: value, email: value, phone: value, profileUrl: value, notes: value });
      expect(csvRows(serializeContactsCsv([related]))[1].slice(1)).toEqual(Array(6).fill(`'${value}`));
      const task = followUp();
      task.title = value;
      task.notes = value;
      const exportedTask = csvRecords(serializeFollowUpsCsv([task]))[0];
      expect(exportedTask.Title).toBe(`'${value}`);
      expect(exportedTask.Notes).toBe(`'${value}`);
    },
  );

  it.each([
    "Acme, Inc.",
    'He said "hello"',
    "First line\nSecond line",
    "First\r\nSecond",
    "עברית Українська",
    "safe = text",
  ])("round-trips plain text %j", (value) => {
    const record = applicationRecord();
    record.application.notes = value;
    expect(csvRecords(serializeApplicationsCsv([record]))[0].Notes).toBe(value);
  });

  it("exports nullable fields as empty cells", () => {
    const record = applicationRecord();
    Object.assign(record.application, {
      location: null,
      jobUrl: null,
      description: null,
      appliedAt: null,
      notes: null,
    });
    record.preparation = { companyResearch: null, talkingPoints: null, interviewerQuestions: null };
    expect(csvRows(serializeApplicationsCsv([record]))[1].slice(4, 12)).toEqual(Array(8).fill(""));
  });

  it("emits BOM-prefixed header-only CSVs with CRLF termination for empty exports", () => {
    for (const [csv, headers] of [
      [serializeApplicationsCsv([]), applicationHeaders],
      [serializeContactsCsv([]), contactHeaders],
      [serializeFollowUpsCsv([]), followUpHeaders],
    ] as const) {
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv.endsWith("\r\n")).toBe(true);
      expect(csvRows(csv)).toEqual([headers]);
    }
  });
});
