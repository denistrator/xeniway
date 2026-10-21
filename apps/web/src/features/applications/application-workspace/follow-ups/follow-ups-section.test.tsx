import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { changeLocale } from "../../../../i18n/i18n";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { workspaceFollowUpTask } from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspace } from "../test-support/render-application-workspace";
import { validateFollowUpDraft } from "./use-follow-ups-controller";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test("follow-ups require a valid date and display the due date as a calendar marker", async () => {
  const user = userEvent.setup();
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask] });
  expect(screen.getByText("26")).toBeVisible();
  expect(screen.getByText("Sep")).toBeVisible();
  expect(screen.getByText("Open")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add follow-up" }));
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  expect(screen.getByText("Task title is required.")).toBeVisible();
  expect(screen.getByText("Due date is required.")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Task" })).toHaveAttribute("aria-invalid", "true");
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Send update");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  expect(screen.getByText("Due date is required.")).toBeVisible();
  const dueDateField = screen.getByLabelText("Due date");
  expect(dueDateField).toHaveAttribute("aria-invalid", "true");
  expect(document.getElementById(dueDateField.getAttribute("aria-describedby") ?? "")).toHaveTextContent(
    "Due date is required.",
  );
});

test("follow-up calendar dates are validated by the shared schema", () => {
  expect(validateFollowUpDraft({ title: "Send update", dueDate: "2026-02-30", notes: "" })).toMatchObject({
    input: null,
    errors: { dueDate: "invalidDate" },
    firstField: "dueDate",
  });
});

test("follow-ups show an empty state and save a dated task", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { followUpTask: workspaceFollowUpTask } }), { status: 201 }),
    );
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ followUpTasks: [] });
  expect(screen.getByText("No follow-ups yet. Add a dated next step.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add follow-up" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Write to Ari");
  await user.type(screen.getByLabelText("Due date"), "2026-09-26");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add follow-up" })));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ title: "Write to Ari", dueDate: "2026-09-26" });
  expect(await screen.findByText("Follow-up saved.")).toBeVisible();
});

test("follow-ups save edits without changing completion state", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify({ data: { followUpTask: workspaceFollowUpTask } }), { status: 200 }),
    );
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask] });
  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Task" }));
  await user.clear(screen.getByRole("textbox", { name: "Task" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), "Call Ari");
  await user.click(screen.getByRole("button", { name: "Save follow-up" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Write to Ari" })));
  expect(fetcher.mock.calls[0][0]).toContain("/follow-ups/8");
  expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).not.toHaveProperty("completedAt");
});

test("follow-ups keep incomplete tasks first and make completion terminal", async () => {
  const user = userEvent.setup();
  const completed = {
    ...workspaceFollowUpTask,
    id: 9,
    title: "Earlier call",
    completedAt: "2026-09-20T00:00:00.000Z",
  };
  const fetcher = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        data: { followUpTask: { ...workspaceFollowUpTask, completedAt: "2026-09-23T00:00:00.000Z" } },
      }),
      { status: 200 },
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ followUpTasks: [completed, workspaceFollowUpTask] });
  const items = screen.getAllByRole("listitem");
  expect(items[0]).toHaveTextContent("Write to Ari");
  expect(items[1]).toHaveTextContent("Earlier call");
  expect(within(items[1]).queryByRole("button", { name: "Complete Earlier call" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Complete Write to Ari" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(fetcher.mock.calls[0][0]).toContain("/follow-ups/8/complete");
  expect(await screen.findByText("Follow-up completed.")).toBeVisible();
});

test("follow-ups confirm deletion and report failures", async () => {
  const user = userEvent.setup();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("", { status: 500 })));
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask] });
  await user.click(screen.getByRole("button", { name: "Delete Write to Ari" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete Write to Ari" })));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not delete follow-up.");
});

test("follow-up deletion preserves its editor until deletion is confirmed", async () => {
  const user = userEvent.setup();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify({ data: { message: "Deleted" } }), { status: 200 })),
  );
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask] });
  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  const task = screen.getByRole("textbox", { name: "Task" });
  await user.type(task, " draft");
  await user.click(screen.getByRole("button", { name: "Delete Write to Ari" }));
  expect(task).toHaveValue("Write to Ari draft");
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Delete Write to Ari" })));
  expect(screen.queryByRole("textbox", { name: "Task" })).toBeNull();
  expect(await screen.findByText("Follow-up deleted.")).toBeVisible();
});

test("asks before replacing a dirty follow-up editor", async () => {
  const user = userEvent.setup();
  const secondTask = { ...workspaceFollowUpTask, id: 9, title: "Call Morgan" };
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask, secondTask] });

  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  const task = screen.getByRole("textbox", { name: "Task" });
  await user.clear(task);
  await user.type(task, "Draft follow-up");
  await user.click(screen.getByRole("button", { name: "Edit Call Morgan" }));

  const warning = screen.getByRole("alertdialog", { name: "Save changes before leaving?" });
  expect(warning).toBeVisible();
  expect(task).toHaveValue("Draft follow-up");
  await user.click(within(warning).getByRole("button", { name: "Keep editing" }));
  expect(task).toHaveValue("Draft follow-up");
  expect(task).toHaveFocus();

  await user.click(screen.getByRole("button", { name: "Edit Call Morgan" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));
  expect(screen.getByRole("textbox", { name: "Task" })).toHaveValue("Call Morgan");
});

test("switches follow-up editors without a warning for whitespace-only changes", async () => {
  const user = userEvent.setup();
  const secondTask = { ...workspaceFollowUpTask, id: 9, title: "Call Morgan" };
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask, secondTask] });

  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  await user.type(screen.getByRole("textbox", { name: "Task" }), " ");
  await user.click(screen.getByRole("button", { name: "Edit Call Morgan" }));

  expect(screen.queryByRole("alertdialog", { name: "Save changes before leaving?" })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Task" })).toHaveValue("Call Morgan");
});

test("retains a pending follow-up switch after a failed warning save", async () => {
  const user = userEvent.setup();
  const secondTask = { ...workspaceFollowUpTask, id: 9, title: "Call Morgan" };
  const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 500 })));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask, secondTask] });

  await user.click(screen.getByRole("button", { name: "Edit Write to Ari" }));
  const task = screen.getByRole("textbox", { name: "Task" });
  await user.clear(task);
  await user.type(task, "Draft follow-up");
  await user.click(screen.getByRole("button", { name: "Edit Call Morgan" }));
  const warning = screen.getByRole("alertdialog", { name: "Save changes before leaving?" });

  await user.click(within(warning).getByRole("button", { name: "Save changes" }));

  expect(await screen.findByText("Could not save follow-up.")).toBeVisible();
  expect(task).toHaveValue("Draft follow-up");
  expect(screen.getByRole("alertdialog", { name: "Save changes before leaving?" })).toBeVisible();
  expect(fetcher).toHaveBeenCalledOnce();

  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));

  expect(screen.getByRole("textbox", { name: "Task" })).toHaveValue("Call Morgan");
});

test("workspace section labels render in Hebrew with right-to-left document direction", async () => {
  await changeLocale("he");
  renderApplicationWorkspace({ followUpTasks: [workspaceFollowUpTask] });
  expect(screen.getByRole("heading", { name: "צעדי המשך" })).toBeVisible();
  expect(document.documentElement.dir).toBe("rtl");
  expect(screen.getByText("פתוח")).toBeVisible();
});
