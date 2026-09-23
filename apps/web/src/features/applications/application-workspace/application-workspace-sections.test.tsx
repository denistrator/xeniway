import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ApplicationContact, ApplicationFollowUpTask, ApplicationPreparation } from "@xeniway/shared";
import type { ReactNode } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { authKeys } from "../../../lib/queries";
import { ContactsSection } from "./contacts-section";
import { FollowUpsSection } from "./follow-ups-section";
import { PreparationSection } from "./preparation-section";

const preparation: ApplicationPreparation = {
  companyResearch: "Existing research",
  talkingPoints: null,
  interviewerQuestions: null,
  updatedAt: null,
};
const contact: ApplicationContact = {
  id: 7,
  applicationId: 3,
  name: "Ari Cole",
  role: "Recruiter",
  email: "ari@example.com",
  phone: "+1 212 555 0123",
  profileUrl: "https://example.com/ari",
  notes: "Hiring team",
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};
const task: ApplicationFollowUpTask = {
  id: 8,
  applicationId: 3,
  title: "Write to Ari",
  dueDate: "2026-09-26",
  notes: null,
  completedAt: null,
  createdAt: "2026-09-01T00:00:00.000Z",
  updatedAt: "2026-09-01T00:00:00.000Z",
};

function setup(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  client.setQueryData(authKeys.csrf, { data: { csrfToken: "csrf" } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeI18n();
  await changeLocale("en");
});

afterEach(() => vi.unstubAllGlobals());

test("preparation saves only the edited field and cancel restores its previous value", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { preparation } }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<PreparationSection applicationId={3} preparation={preparation} />);

  await user.click(screen.getByRole("button", { name: "Edit company research" }));
  const research = screen.getByRole("textbox", { name: "Company research" });
  await user.clear(research);
  await user.type(research, "New research");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Existing research")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Edit talking points" }));
  await user.type(screen.getByRole("textbox", { name: "Talking points" }), "Ask about growth");
  await user.click(screen.getByRole("button", { name: "Save talking points" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ talkingPoints: "Ask about growth" });
  expect(await screen.findByText("Talking points saved.")).toBeVisible();
  expect(screen.getByText("Ask about growth")).toBeVisible();
});

test("preparation announces pending and failed saves without losing the draft", async () => {
  const user = userEvent.setup();
  let reject!: (error: Error) => void;
  vi.stubGlobal(
    "fetch",
    vi.fn().mockReturnValue(
      new Promise((_resolve, fail) => {
        reject = fail;
      }),
    ),
  );
  setup(<PreparationSection applicationId={3} preparation={preparation} />);
  await user.click(screen.getByRole("button", { name: "Edit company research" }));
  await user.type(screen.getByRole("textbox", { name: "Company research" }), " update");
  await user.click(screen.getByRole("button", { name: "Save company research" }));
  expect(screen.getByText("Saving…")).toBeVisible();
  reject(new Error("offline"));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not save company research.");
  expect(screen.getByRole("alert")).toHaveClass("text-rose-600");
  expect(screen.getByRole("textbox", { name: "Company research" })).toHaveValue("Existing research update");
});

test("contacts show safe links, plain notes, and an actionable empty state", () => {
  setup(<ContactsSection applicationId={3} contacts={[contact]} />);
  expect(screen.getByRole("link", { name: "ari@example.com" })).toHaveAttribute("href", "mailto:ari@example.com");
  expect(screen.getByRole("link", { name: "+1 212 555 0123" })).toHaveAttribute("href", "tel:+12125550123");
  expect(screen.getByRole("link", { name: "Profile for Ari Cole" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("link", { name: "Profile for Ari Cole" })).toHaveAttribute("href", "https://example.com/ari");
});

test("contacts do not turn invalid stored profile URLs into links", () => {
  setup(
    <ContactsSection
      applicationId={3}
      contacts={[{ ...contact, profileUrl: "javascript:alert(1)", notes: "<script>text</script>" }]}
    />,
  );
  expect(screen.queryByRole("link", { name: "Profile for Ari Cole" })).toBeNull();
  expect(screen.getByText("<script>text</script>")).toBeVisible();
  expect(document.querySelector("script")).toBeNull();
});

test("contacts validate required fields and save a new contact", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { contact } }), { status: 201 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<ContactsSection applicationId={3} contacts={[]} />);
  expect(screen.getByText("No contacts yet. Add someone you may speak with.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add contact" }));
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a name and role.");
  await user.type(screen.getByRole("textbox", { name: "Name" }), "Ari Cole");
  await user.type(screen.getByRole("textbox", { name: "Role" }), "Recruiter");
  await user.type(screen.getByRole("textbox", { name: "Profile URL" }), "javascript:alert(1)");
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid HTTP or HTTPS profile URL.");
  await user.clear(screen.getByRole("textbox", { name: "Profile URL" }));
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    name: "Ari Cole",
    role: "Recruiter",
    profileUrl: null,
  });
  expect(await screen.findByText("Contact saved.")).toBeVisible();
});

test("contacts edit, cancel, confirm removal, and announce server errors", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<ContactsSection applicationId={3} contacts={[contact]} />);
  await user.click(screen.getByRole("button", { name: "Edit Ari Cole" }));
  await user.clear(screen.getByRole("textbox", { name: "Role" }));
  await user.type(screen.getByRole("textbox", { name: "Role" }), "Lead recruiter");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.getByText("Recruiter")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Remove Ari Cole" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "No" }));
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Remove Ari Cole" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not remove contact.");
  expect(screen.getByRole("alert")).toHaveClass("text-rose-600");
});

test("contacts save edits through the owned contact endpoint", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { contact } }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<ContactsSection applicationId={3} contacts={[contact]} />);
  await user.click(screen.getByRole("button", { name: "Edit Ari Cole" }));
  await user.clear(screen.getByRole("textbox", { name: "Role" }));
  await user.type(screen.getByRole("textbox", { name: "Role" }), "Hiring manager");
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][0]).toContain("/applications/3/contacts/7");
  expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ role: "Hiring manager" });
});

test("follow-ups require a valid date and display the due date as a calendar marker", async () => {
  const user = userEvent.setup();
  setup(<FollowUpsSection applicationId={3} tasks={[task]} />);
  expect(screen.getByText("26")).toBeVisible();
  expect(screen.getByText("Sep")).toBeVisible();
  expect(screen.getByText("Open")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add follow-up" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Send update");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Enter a task and due date.");
});

test("follow-ups show an empty state and save a dated task", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { followUpTask: task } }), { status: 201 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<FollowUpsSection applicationId={3} tasks={[]} />);
  expect(screen.getByText("No follow-ups yet. Add a dated next step.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add follow-up" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Write to Ari");
  await user.type(screen.getByLabelText("Due date"), "2026-09-26");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ title: "Write to Ari", dueDate: "2026-09-26" });
  expect(await screen.findByText("Follow-up saved.")).toBeVisible();
});

test("follow-ups save edits without changing completion state", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { followUpTask: task } }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  setup(<FollowUpsSection applicationId={3} tasks={[task]} />);
  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  await user.clear(screen.getByRole("textbox", { name: "Task" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Call Ari");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][0]).toContain("/follow-ups/8");
  expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty("completedAt");
});

test("follow-ups keep incomplete tasks first and make completion terminal", async () => {
  const user = userEvent.setup();
  const completed = { ...task, id: 9, title: "Earlier call", completedAt: "2026-09-20T00:00:00.000Z" };
  const fetcher = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ data: { followUpTask: { ...task, completedAt: "2026-09-23T00:00:00.000Z" } } }), {
      status: 200,
    }),
  );
  vi.stubGlobal("fetch", fetcher);
  setup(<FollowUpsSection applicationId={3} tasks={[completed, task]} />);
  const items = screen.getAllByRole("listitem");
  expect(items[0]).toHaveTextContent("Write to Ari");
  expect(items[1]).toHaveTextContent("Earlier call");
  expect(items[1]).toHaveClass("bg-surface-tint");
  expect(within(items[1]).queryByRole("button", { name: "Complete Earlier call" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Complete Write to Ari" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][0]).toContain("/follow-ups/8/complete");
  expect(await screen.findByText("Follow-up completed.")).toBeVisible();
});

test("follow-ups confirm deletion and report failures", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
  setup(<FollowUpsSection applicationId={3} tasks={[task]} />);
  await user.click(screen.getByRole("button", { name: "Delete Write to Ari" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete follow-up.");
});

test("workspace section labels render in Hebrew with right-to-left document direction", async () => {
  await changeLocale("he");
  setup(<FollowUpsSection applicationId={3} tasks={[task]} />);
  expect(screen.getByRole("heading", { name: "צעדי המשך" })).toBeVisible();
  expect(document.documentElement.dir).toBe("rtl");
  expect(screen.getByText("פתוח")).toBeVisible();
});
