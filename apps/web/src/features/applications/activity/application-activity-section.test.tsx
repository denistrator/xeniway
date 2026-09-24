import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApplicationEvent } from "@xeniway/shared";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { authKeys } from "../../../lib/queries";
import { ApplicationActivitySection } from "./application-activity-section";

const manualEvent: ApplicationEvent = {
  id: 1,
  applicationId: 3,
  type: "note",
  title: "Recruiter context",
  description: "Prefers email",
  occurredAt: "2026-09-01T12:00:00.000Z",
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
  metadata: null,
  isSystem: false,
};

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeI18n();
  await changeLocale("en");
});

test("uses supplied events without fetching application details", () => {
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);

  renderActivity([{ ...manualEvent, isSystem: true, type: "application_created" }, manualEvent]);

  expect(screen.getByRole("list", { name: "Activity timeline" })).toHaveTextContent("Recruiter context");
  expect(screen.getByRole("button", { name: "Edit Recruiter context" })).toBeVisible();
  expect(screen.getAllByRole("button", { name: /Edit/ })).toHaveLength(1);
  expect(fetcher).not.toHaveBeenCalled();
});

test("creates activity and restores focus to the add action", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { event: { ...manualEvent, id: 2, title: "Interview debrief" } } }), {
      status: 201,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  renderActivity([]);

  const addButton = screen.getByRole("button", { name: "Add activity" });
  await user.click(addButton);
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Interview debrief");
  await user.click(screen.getByRole("button", { name: "Save activity" }));

  await waitFor(() => expect(addButton).toHaveFocus());
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/events", expect.objectContaining({ method: "POST" }));
  const headers = new Headers(fetcher.mock.calls[0][1]?.headers);
  expect(headers.get("x-csrf-token")).toBe("csrf");
});

function renderActivity(events: ApplicationEvent[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationActivitySection applicationId={3} events={events} />
    </QueryClientProvider>,
  );
}
