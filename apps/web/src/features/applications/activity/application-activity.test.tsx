import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { authKeys } from "../../../lib/queries";
import { initializeTestI18n } from "../../../test/initialize-test-i18n";
import { ApplicationActivity } from "./application-activity";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
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

function renderActivity() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  return render(
    <QueryClientProvider client={client}>
      <ApplicationActivity applicationId={3} />
    </QueryClientProvider>,
  );
}

function applicationDetailResponse() {
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
        events: [],
        preparation: { companyResearch: null, talkingPoints: null, interviewerQuestions: null, updatedAt: null },
        contacts: [],
        followUpTasks: [],
      },
    }),
    { status: 200 },
  );
}
