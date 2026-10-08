import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApplicationEvent } from "@xeniway/shared";
import { beforeEach, expect, test, vi } from "vitest";
import { authKeys } from "../../../lib/queries";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { ApplicationActivitySection } from "./application-activity-section.view";

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
  await initializeTestI18n();
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

test("edits activity with a scoped PATCH and restores focus", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { event: manualEvent } })));
  vi.stubGlobal("fetch", fetcher);
  renderActivity([manualEvent]);

  const edit = screen.getByRole("button", { name: "Edit Recruiter context" });
  await user.click(edit);
  expect(screen.getByRole("combobox", { name: "Activity type" })).toHaveFocus();
  await user.clear(screen.getByRole("textbox", { name: "Title" }));
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Updated context");
  await user.click(screen.getByRole("button", { name: "Save activity" }));

  await waitFor(() => expect(edit).toHaveFocus());
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/events/1", expect.objectContaining({ method: "PATCH" }));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({
    type: "note",
    title: "Updated context",
    description: "Prefers email",
    occurredAt: manualEvent.occurredAt,
  });
  expect(new Headers(fetcher.mock.calls[0][1].headers).get("x-csrf-token")).toBe("csrf");
});

test("cancels editing without a request and restores focus", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn();
  vi.stubGlobal("fetch", fetcher);
  renderActivity([manualEvent]);
  const edit = screen.getByRole("button", { name: "Edit Recruiter context" });
  await user.click(edit);
  await user.type(screen.getByRole("textbox", { name: "Title" }), " draft");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(edit).toHaveFocus();
  expect(fetcher).not.toHaveBeenCalled();
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
});

test("deletes only after confirmation and restores focus to Add activity", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { message: "Deleted" } })));
  vi.stubGlobal("fetch", fetcher);
  renderActivity([manualEvent]);
  const add = screen.getByRole("button", { name: "Add activity" });

  await user.click(screen.getByRole("button", { name: "Delete Recruiter context" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "No" }));
  expect(add).toHaveFocus();
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Delete Recruiter context" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));

  await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
  expect(add).toHaveFocus();
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(fetcher).toHaveBeenCalledWith("/api/applications/3/events/1", expect.objectContaining({ method: "DELETE" }));
  expect(new Headers(fetcher.mock.calls[0][1].headers).get("x-csrf-token")).toBe("csrf");
});

test("reports a failed deletion and returns focus without changing supplied events", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  renderActivity([manualEvent]);
  await user.click(screen.getByRole("button", { name: "Delete Recruiter context" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to delete activity.");
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getByRole("button", { name: "Add activity" })).toHaveFocus();
  expect(screen.getByRole("list", { name: "Activity timeline" })).toHaveTextContent(manualEvent.title);
});

test("retains the draft after a failed save", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  renderActivity([manualEvent]);
  await user.click(screen.getByRole("button", { name: "Edit Recruiter context" }));
  await user.type(screen.getByRole("textbox", { name: "Title" }), " draft");
  await user.click(screen.getByRole("button", { name: "Save activity" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to save activity.");
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Recruiter context draft");
  expect(screen.getByRole("button", { name: "Save activity" })).toBeEnabled();
});

function renderActivity(events: ApplicationEvent[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationActivitySection applicationId={3} events={events} />
    </QueryClientProvider>,
  );
}
