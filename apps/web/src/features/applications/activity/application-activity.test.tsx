import { onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { authKeys } from "../../../lib/queries";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { OfflineAccessProvider } from "../../offline/offline-access";
import { ApplicationActivity } from "./application-activity";

beforeEach(async () => {
  vi.restoreAllMocks();
  onlineManager.setOnline(true);
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test.each(["No", "backdrop", "Escape"])(
  "keeps collection activity deletion dismissible with %s after disconnection",
  async (dismiss) => {
    const user = userEvent.setup();
    const fetcher = vi.fn().mockResolvedValue(applicationDetailResponse(true));
    vi.stubGlobal("fetch", fetcher);
    renderActivity(true);
    await user.click(await screen.findByRole("button", { name: "Delete Recruiter context" }));
    act(() => window.dispatchEvent(new Event("offline")));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "No" })).toBeEnabled();
    if (dismiss === "Escape") await user.keyboard("{Escape}");
    else if (dismiss === "backdrop") await user.click(screen.getAllByRole("button", { name: "No" })[0]);
    else await user.click(within(dialog).getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("region", { name: "Activity" })).toHaveFocus();
    expect(screen.getByText("Recruiter context")).toBeVisible();
    expect(screen.getByRole("button", { name: "Add activity" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Edit Recruiter context" })).toBeDisabled();
    expect(fetcher).toHaveBeenCalledTimes(1);
  },
);

test("keeps collection activity drafts readable and cancellable after disconnection", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(applicationDetailResponse(true));
  vi.stubGlobal("fetch", fetcher);
  renderActivity(true);
  await user.click(await screen.findByRole("button", { name: "Edit Recruiter context" }));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("textbox", { name: "Title" })).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: "Save activity" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("textbox", { name: "Title" })).toBeNull();
  expect(screen.getByRole("region", { name: "Activity" })).toHaveFocus();
  expect(fetcher).toHaveBeenCalledTimes(1);
});

test("shows loading while its application-detail query is pending", () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise<Response>(() => undefined)),
  );

  renderActivity();

  expect(screen.getByText("Loading…")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add activity" })).toHaveAttribute("aria-disabled", "true");
});

test("retries a failed detail query and renders its controlled section", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { code: "REQUEST_FAILED", message: "Request failed" } }), { status: 500 }),
    )
    .mockResolvedValueOnce(applicationDetailResponse());
  vi.stubGlobal("fetch", fetcher);
  renderActivity();

  expect(await screen.findByRole("alert")).toHaveTextContent("Unable to load activity.");
  await user.click(screen.getByRole("button", { name: "Retry" }));

  expect(await screen.findByText("No activity yet.")).toBeVisible();
  expect(screen.getByRole("button", { name: "Add activity" })).toBeEnabled();
  expect(fetcher).toHaveBeenCalledTimes(2);
});

function renderActivity(withOfflineAccess = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  client.setQueryData(authKeys.me, { data: { user: { id: 1, email: "candidate@example.com" } } });
  return render(
    <QueryClientProvider client={client}>
      {withOfflineAccess ? (
        <OfflineAccessProvider
          initialAccount={{
            version: 1,
            userId: 1,
            email: "candidate@example.com",
            verifiedAt: Date.now(),
            expiresAt: Date.now() + 60_000,
            ready: true,
            buildId: null,
          }}
        >
          <ApplicationActivity applicationId={3} />
        </OfflineAccessProvider>
      ) : (
        <ApplicationActivity applicationId={3} />
      )}
    </QueryClientProvider>,
  );
}

function applicationDetailResponse(withEvent = false) {
  return new Response(
    JSON.stringify({
      data: {
        application: {
          id: 3,
          company: "Northwind",
          position: "Engineer",
          status: "saved",
          location: null,
          salary: null,
          jobUrl: null,
          description: null,
          appliedAt: null,
          notes: null,
          createdAt: "2026-09-01T00:00:00.000Z",
          updatedAt: "2026-09-01T00:00:00.000Z",
          sortOrder: 0,
          archivedAt: null,
          blacklistedAt: null,
          blacklistReason: null,
        },
        events: withEvent
          ? [
              {
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
              },
            ]
          : [],
        preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null, updatedAt: null },
        contacts: [],
        followUpTasks: [],
      },
    }),
    { status: 200 },
  );
}
