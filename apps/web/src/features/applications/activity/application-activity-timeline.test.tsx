import { render, screen } from "@testing-library/react";
import type { ApplicationEvent } from "@xeniway/shared";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { ApplicationActivityTimeline } from "./application-activity-timeline";

beforeEach(async () => {
  await initializeI18n();
  await changeLocale("en");
});

const event: ApplicationEvent = {
  id: 1,
  applicationId: 2,
  type: "follow_up",
  title: "Contact recruiter",
  description: "Send a short update",
  occurredAt: "2026-09-01T12:00:00.000Z",
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
  metadata: null,
  isSystem: false,
};

test("renders localized activity and editable user events", () => {
  render(<ApplicationActivityTimeline events={[event]} onEdit={vi.fn()} onDelete={vi.fn()} />);

  expect(screen.getByRole("list", { name: "Activity timeline" })).toHaveTextContent("Contact recruiter");
  expect(screen.getByText("Follow-up")).toBeVisible();
  expect(screen.getByRole("button", { name: "Edit Contact recruiter" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Delete Contact recruiter" })).toBeVisible();
});

test("shows an empty state when no activity has been recorded", () => {
  render(<ApplicationActivityTimeline events={[]} onEdit={vi.fn()} onDelete={vi.fn()} />);
  expect(screen.getByText("No activity yet.")).toBeVisible();
});

test("does not allow editing system history", () => {
  render(
    <ApplicationActivityTimeline
      events={[{ ...event, type: "application_created", isSystem: true }]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByText("Application created")).toBeVisible();
  expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
});

test("renders user text as plain text in right-to-left Hebrew", async () => {
  await changeLocale("he");
  render(
    <ApplicationActivityTimeline
      events={[{ ...event, title: "<img src=x onerror=alert(1)>" }]}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
    />,
  );
  expect(screen.getByRole("list", { name: "ציר זמן של פעילות" })).toBeVisible();
  expect(screen.getByText("פנייה חוזרת")).toBeVisible();
  expect(screen.getByText("<img src=x onerror=alert(1)>")).toBeVisible();
  expect(screen.queryByRole("img")).toBeNull();
  expect(document.documentElement.dir).toBe("rtl");
});
