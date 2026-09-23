import { describe, expect, it } from "vitest";
import { serializeApplicationsCsv } from "./export-csv";

describe("application CSV export", () => {
  it("serializes all application fields and activity as spreadsheet-safe CSV", () => {
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
        events: [
          {
            id: 7,
            applicationId: 3,
            type: "interview_scheduled",
            title: "First round",
            description: "Discussed the role",
            occurredAt: "2026-09-02T09:00:00.000Z",
            createdAt: "2026-09-02T09:00:00.000Z",
            updatedAt: "2026-09-02T09:00:00.000Z",
            metadata: null,
            isSystem: false,
          },
        ],
      },
    ]);

    expect(csv).toContain('"company","position","status","board"');
    expect(csv).toContain('"\'=HYPERLINK(""https://bad.example"")"');
    expect(csv).toContain('"Engineer, Platform"');
    expect(csv).toContain('"Line one\nLine two"');
    expect(csv).toContain('"[{""type"":""interview_scheduled""');
    expect(csv).not.toContain('"id"');
    expect(csv.startsWith("\uFEFF")).toBe(true);
  });

  it("returns a header row when the user has no applications", () => {
    const csv = serializeApplicationsCsv([]);

    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv.split("\r\n")[0]).toContain("activity");
  });
});
