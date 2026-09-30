import { describe, expect, it } from "vitest";
import { serializeApplicationsCsv } from "./export-csv";

describe("application CSV export", () => {
  it("serializes the explicit application field allowlist as spreadsheet-safe CSV", () => {
    const csv = serializeApplicationsCsv([
      {
        application: {
          id: 3,
          company: '=HYPERLINK("https://bad.example")',
          position: "Engineer, Platform",
          location: "Remote",
          salary: null,
          jobUrl: "https://example.com/jobs/3",
          description: "Line one\nLine two",
          status: "interview",
          sortOrder: 1,
          appliedAt: "2026-09-01",
          notes: "Asked about on-call",
          createdAt: "2026-08-30T10:00:00.000Z",
          updatedAt: "2026-09-02T10:00:00.000Z",
          archivedAt: null,
          blacklistedAt: null,
          blacklistReason: null,
        },
        preparation: {
          companyResearch: "Research the platform roadmap",
          talkingPoints: "Ask about incident response",
          interviewerQuestions: "How does the team make decisions?",
        },
      },
    ]);

    expect(csv).toContain('"Company","Position","Status","Board"');
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csv).toContain('"Engineer, Platform"');
    expect(csv).toContain('"Line one\nLine two"');
    expect(csv.split("\r\n")[0]).toBe(
      '﻿"Company","Position","Status","Board","Location","Job URL","Description","Applied at","Notes","Company research","Talking points","Interviewer questions","Created at","Updated at"',
    );
    expect(csv).toContain('"Research the platform roadmap"');
    expect(csv).toContain('"Ask about incident response"');
    expect(csv).toContain('"How does the team make decisions?"');
    expect(csv).not.toContain('"salary"');
    expect(csv).not.toContain('"activity"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("returns a header row when the user has no applications", () => {
    const csv = serializeApplicationsCsv([]);

    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv.split("\r\n")[0]).toContain("Updated at");
  });

  it("leaves preparation columns blank when an application has no workspace record", () => {
    const csv = serializeApplicationsCsv([
      {
        application: {
          id: 4,
          company: "No workspace",
          position: "Engineer",
          location: null,
          salary: null,
          jobUrl: null,
          description: null,
          status: "saved",
          sortOrder: 0,
          appliedAt: null,
          notes: null,
          createdAt: "2026-09-01T10:00:00.000Z",
          updatedAt: "2026-09-01T10:00:00.000Z",
          archivedAt: null,
          blacklistedAt: null,
          blacklistReason: null,
        },
        preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null },
      },
    ]);

    expect(csv.split("\r\n")[1]).toContain(',"","","","2026-09-01T10:00:00.000Z","2026-09-01T10:00:00.000Z"');
  });
});
