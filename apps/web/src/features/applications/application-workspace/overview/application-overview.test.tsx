import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import {
  createApplicationWorkspaceData,
  workspaceContact,
  workspaceFollowUpTask,
} from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspace } from "../test-support/render-application-workspace";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test("keeps keyboard status selection and focus return inside the application heading", async () => {
  const user = userEvent.setup();
  renderApplicationWorkspace();
  const trigger = screen.getByRole("button", { name: "Status, Change status" });
  act(() => trigger.focus());

  await user.keyboard("{Enter}");
  expect(screen.getByRole("radio", { name: "Saved" })).toHaveFocus();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("radio", { name: "Saved" })).toBeNull();
  expect(trigger).toHaveFocus();
});

test.each([
  { state: {}, label: "Back to Applications", href: "/" },
  { state: { archivedAt: "2026-09-20T00:00:00.000Z" }, label: "Back to Archive", href: "/archive" },
  { state: { blacklistedAt: "2026-09-20T00:00:00.000Z" }, label: "Back to Blacklist", href: "/blacklist" },
])("focuses the company heading and links back to the owning board", ({ state, label, href }) => {
  const data = createApplicationWorkspaceData();
  renderApplicationWorkspace({ application: { ...data.application, ...state } });

  expect(screen.getByRole("heading", { name: "Northwind" })).toHaveFocus();
  expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
});

test("confirms dirty compact changes and saves only the selected field", async () => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace();

  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Location" }), "Remote");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));

  const warning = screen.getByRole("alertdialog", { name: "Save changes before leaving?" });
  await user.click(within(warning).getByRole("button", { name: "Save changes" }));

  await waitFor(() => expect(screen.getByRole("textbox", { name: /Company/ })).toBeVisible());
  expect(readUpdateBodies(fetcher)[0]).toEqual({ location: "Remote" });
});

test("locks a compact field while its save is pending", async () => {
  const user = userEvent.setup();
  let resolveSave: ((response: Response) => void) | undefined;
  const fetcher = vi.fn(
    () =>
      new Promise<Response>((resolve) => {
        resolveSave = resolve;
      }),
  );
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace();

  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  const location = screen.getByRole("textbox", { name: "Location" });
  await user.type(location, "Remote");
  await user.click(screen.getByRole("button", { name: "Save location" }));

  await waitFor(() => expect(fetcher).toHaveBeenCalledOnce());
  expect(location).toHaveAttribute("readonly");
  expect(screen.getByRole("status")).toHaveTextContent("Saving…");

  resolveSave?.(
    new Response(JSON.stringify({ data: { application: { id: 3, location: "Remote" } } }), { status: 200 }),
  );
});

test.each(["Escape", "backdrop", "Keep editing"])("preserves the compact draft after %s", async (dismiss) => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace();
  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  const input = screen.getByRole("textbox", { name: "Location" });
  await user.type(input, "  Remote draft  ");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));
  const dialog = within(screen.getByRole("alertdialog"));

  switch (dismiss) {
    case "Escape": {
      await user.keyboard("{Escape}");
      break;
    }
    case "backdrop": {
      await user.click(screen.getAllByRole("button", { name: "Keep editing" })[0]);
      break;
    }
    default: {
      await user.click(dialog.getByRole("button", { name: "Keep editing" }));
    }
  }

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getByRole("textbox", { name: "Location" })).toBe(input);
  expect(input).toHaveValue("  Remote draft  ");
  expect(input).toHaveFocus();
  expect(screen.queryByRole("textbox", { name: /^Company/ })).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Save location" }));
  await waitFor(() => expect(screen.queryByRole("textbox", { name: "Location" })).toBeNull());
  expect(screen.queryByRole("textbox", { name: /^Company/ })).toBeNull();
  expect(readUpdateBodies(fetcher)).toEqual([{ location: "Remote draft" }]);
});

test("switches fields only after explicitly discarding the compact draft", async () => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace();
  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Location" }), "Do not save");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));

  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.getByRole("textbox", { name: /^Company/ })).toHaveFocus();
  expect(screen.queryByRole("textbox", { name: "Location" })).toBeNull();
  expect(screen.queryByText("Do not save")).toBeNull();
  expect(fetcher).not.toHaveBeenCalled();
});

test("keeps the compact draft after a failed warning save and dismissal", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn(() => Promise.resolve(new Response(null, { status: 500 })));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace();
  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  const input = screen.getByRole("textbox", { name: "Location" });
  await user.type(input, "Remote draft");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Save changes" }));
  await waitFor(() => {
    expect(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Save changes" })).toBeEnabled();
  });
  await user.keyboard("{Escape}");

  expect(input).toHaveValue("Remote draft");
  expect(input).toHaveFocus();
  expect(screen.queryByRole("textbox", { name: /^Company/ })).toBeNull();
  expect(fetcher).toHaveBeenCalledOnce();
});

test("keeps localized dates, saved metadata, and empty-value fallbacks readable", () => {
  const data = createApplicationWorkspaceData();
  renderApplicationWorkspace({
    application: { ...data.application, appliedAt: "2026-10-05", salary: "€72,000", location: null },
  });

  expect(screen.getByText("Oct 5, 2026")).toBeVisible();
  expect(screen.getByText("€72,000")).toBeVisible();
  expect(screen.getByText("Location").parentElement).toHaveTextContent("Not provided");
});

test("allows simultaneous large-field editing and nullable URL updates", async () => {
  const user = userEvent.setup();
  const data = createApplicationWorkspaceData();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({ application: { ...data.application, jobUrl: "https://example.com/job" } });

  await user.click(screen.getByRole("button", { name: "About, Edit" }));
  await user.click(screen.getByRole("button", { name: "Application notes, Edit" }));
  expect(screen.getByRole("textbox", { name: "About" })).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Application notes" })).toBeVisible();

  await user.click(screen.getByRole("button", { name: "Job listing, Edit" }));
  await user.clear(screen.getByRole("textbox", { name: "Job listing" }));
  await user.click(screen.getByRole("button", { name: "Save job listing" }));

  await waitFor(() => expect(screen.getByRole("button", { name: "Job listing, Edit" })).toHaveFocus());
  expect(readUpdateBodies(fetcher)).toContainEqual({ jobUrl: null });
});

test("saves status selection immediately and rejects unsafe job links", async () => {
  const user = userEvent.setup();
  const data = createApplicationWorkspaceData();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({ application: { ...data.application, jobUrl: "javascript:alert(1)" } });

  expect(screen.queryByRole("link", { name: "javascript:alert(1)" })).toBeNull();
  await user.click(screen.getByRole("button", { name: "Status, Change status" }));
  await user.click(screen.getByRole("radio", { name: "Applied" }));

  await waitFor(() => expect(readUpdateBodies(fetcher)).toContainEqual({ status: "applied" }));
});

test.each([
  { label: "Company", text: "Northwind" },
  { label: "About", text: "Read this description" },
  { label: "Company research", text: "Existing research" },
])("does not enter the real $label editor after disconnection", async ({ label, text }) => {
  const data = createApplicationWorkspaceData();
  renderApplicationWorkspace({ application: { ...data.application, description: "Read this description" } }, true);
  act(() => window.dispatchEvent(new Event("offline")));
  fireEvent.click(screen.getByText(text));
  expect(screen.queryByRole("textbox", { name: new RegExp(label) })).toBeNull();
});

test.each(["About", "Company research", "Location"])(
  "keeps the real %s editor cancel available after disconnection and blocks saving",
  async (label) => {
    const user = userEvent.setup();
    const fetcher = stubApplicationUpdates();
    renderApplicationWorkspace({}, true);
    await user.click(screen.getByRole("button", { name: `${label}, Edit` }));
    await user.type(screen.getByRole("textbox", { name: label }), "Draft");
    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("button", { name: `Save ${label.toLowerCase()}` })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("textbox", { name: label })).toBeNull();
    if (label === "Location") {
      expect(document.querySelector('[data-compact-edit-field="location"]')).toHaveFocus();
    } else {
      expect(screen.getByRole("region", { name: label })).toHaveFocus();
    }
    expect(fetcher).not.toHaveBeenCalled();
  },
);

test.each([
  { label: "Company research", action: "Cancel" },
  { label: "Company research", action: "Save company research" },
  { label: "Location", action: "Cancel" },
  { label: "Location", action: "Save location" },
])("hands focused $action to replacement Cancel when $label becomes read-only", async ({ label, action }) => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({}, true);
  await user.click(screen.getByRole("button", { name: `${label}, Edit` }));
  const input = screen.getByRole("textbox", { name: label });
  await user.type(input, "Draft");
  const draft = (input as HTMLInputElement | HTMLTextAreaElement).value;
  const originalAction = screen.getByRole("button", { name: action });
  act(() => originalAction.focus());
  expect(originalAction).toHaveFocus();

  act(() => window.dispatchEvent(new Event("offline")));

  expect(originalAction).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
  expect(input).toHaveValue(draft);
  expect(input).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: `Save ${label.toLowerCase()}` })).toBeDisabled();
  await user.keyboard("{Enter}");
  expect(screen.queryByRole("textbox", { name: label })).toBeNull();
  if (label === "Location") {
    expect(document.querySelector('[data-compact-edit-field="location"]')).toHaveFocus();
  } else {
    expect(screen.getByRole("region", { name: label })).toHaveFocus();
  }
  expect(fetcher).not.toHaveBeenCalled();
});

test.each(["input", "outside"])("read-only transition preserves %s focus", async (target) => {
  const user = userEvent.setup();
  renderApplicationWorkspace({}, true);
  await user.click(screen.getByRole("button", { name: "Company research, Edit" }));
  const input = screen.getByRole("textbox", { name: "Company research" });
  const focused = target === "input" ? input : screen.getByRole("link", { name: "Back to Applications" });
  act(() => focused.focus());
  expect(focused).toHaveFocus();
  act(() => window.dispatchEvent(new Event("offline")));
  expect(focused).toHaveFocus();
});

test.each(["Company research", "Location"])(
  "Escape cancels %s after focus transfers to replacement Cancel",
  async (label) => {
    const user = userEvent.setup();
    renderApplicationWorkspace({}, true);
    await user.click(screen.getByRole("button", { name: `${label}, Edit` }));
    await user.type(screen.getByRole("textbox", { name: label }), "Draft");
    act(() => screen.getByRole("button", { name: "Cancel" }).focus());
    act(() => window.dispatchEvent(new Event("offline")));
    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("textbox", { name: label })).toBeNull();
  },
);

test.each([
  { action: "Add contact", input: "Name", save: "Save contact" },
  { action: "Add follow-up", input: "Task", save: "Save follow-up" },
  { action: "Add activity", input: "Title", save: "Save activity" },
])("keeps $action drafts read-only and cancellable after disconnection", async ({ action, input, save }) => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({}, true);
  await user.click(screen.getByRole("button", { name: action }));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("textbox", { name: input })).toHaveAttribute("readonly");
  expect(screen.getByRole("button", { name: save })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("textbox", { name: input })).toBeNull();
  let regionName = "Activity";
  switch (action) {
    case "Add contact":
      regionName = "Contacts";
      break;
    case "Add follow-up":
      regionName = "Follow-ups";
      break;
  }
  expect(screen.getByRole("region", { name: regionName })).toHaveFocus();
  expect(fetcher).not.toHaveBeenCalled();
});

test("keeps contact links and follow-up content readable while disabling their mutations", () => {
  renderApplicationWorkspace({ contacts: [workspaceContact], followUpTasks: [workspaceFollowUpTask] }, true);
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("link", { name: "ari@example.com" })).toHaveAttribute("href", "mailto:ari@example.com");
  expect(screen.getByText("Write to Ari")).toBeVisible();
  for (const name of [
    "Add contact",
    "Edit Ari Cole",
    "Remove Ari Cole",
    "Add follow-up",
    "Edit Write to Ari",
    "Delete Write to Ari",
    "Complete Write to Ari",
    "Status, Change status",
  ]) {
    expect(screen.getByRole("button", { name })).toBeDisabled();
  }
});

test.each(["Remove Ari Cole", "Delete Write to Ari"])(
  "keeps %s confirmation cancellable after disconnection",
  async (action) => {
    const user = userEvent.setup();
    renderApplicationWorkspace({ contacts: [workspaceContact], followUpTasks: [workspaceFollowUpTask] }, true);
    await user.click(screen.getByRole("button", { name: action }));
    act(() => window.dispatchEvent(new Event("offline")));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Yes" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "No" })).toBeEnabled();
    await user.click(within(dialog).getByRole("button", { name: "No" }));
    expect(screen.queryByRole("alertdialog")).toBeNull();
  },
);

test("blocks unsaved-warning saving after disconnection while preserving the draft on dismissal", async () => {
  const user = userEvent.setup();
  renderApplicationWorkspace({}, true);
  await user.click(screen.getByRole("button", { name: "Location, Edit" }));
  await user.type(screen.getByRole("textbox", { name: "Location" }), "Remote");
  await user.click(screen.getByRole("button", { name: "Company, Edit" }));
  act(() => window.dispatchEvent(new Event("offline")));
  const dialog = screen.getByRole("alertdialog");
  expect(within(dialog).getByRole("button", { name: "Save changes" })).toBeDisabled();
  expect(within(dialog).getByRole("button", { name: "Keep editing" })).toBeEnabled();
  await user.click(within(dialog).getByRole("button", { name: "Keep editing" }));
  expect(screen.queryByRole("alertdialog")).toBeNull();
  expect(screen.queryByRole("textbox", { name: /^Company/ })).toBeNull();
  expect(screen.getByRole("textbox", { name: "Location" })).toHaveValue("Remote");
  expect(screen.getByRole("textbox", { name: "Location" })).toHaveFocus();
});

test.each(["Company, Edit", "Status, Change status"])(
  "discards a compact draft offline without starting the pending %s edit",
  async (action) => {
    const user = userEvent.setup();
    const fetcher = stubApplicationUpdates();
    renderApplicationWorkspace({}, true);
    await user.click(screen.getByRole("button", { name: "Location, Edit" }));
    await user.type(screen.getByRole("textbox", { name: "Location" }), "Do not save");
    await user.click(screen.getByRole("button", { name: action }));
    act(() => window.dispatchEvent(new Event("offline")));
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Discard changes" }));

    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.queryByRole("textbox", { name: "Location" })).toBeNull();
    expect(screen.queryByRole("textbox", { name: /^Company/ })).toBeNull();
    expect(screen.queryAllByRole("radio")).toHaveLength(0);
    expect(document.querySelector('[data-compact-edit-field="location"]')).toHaveFocus();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

test("disables an open status menu after disconnection and keeps Escape with focus return", async () => {
  const user = userEvent.setup();
  const fetcher = stubApplicationUpdates();
  renderApplicationWorkspace({}, true);
  await user.click(screen.getByRole("button", { name: "Status, Change status" }));
  act(() => window.dispatchEvent(new Event("offline")));
  expect(screen.getByRole("radio", { name: "Applied" })).toBeDisabled();
  await user.keyboard("{Escape}");
  expect(screen.queryByRole("radio", { name: "Applied" })).toBeNull();
  expect(document.querySelector('[data-compact-edit-field="status"]')).toHaveFocus();
  expect(fetcher).not.toHaveBeenCalled();
});

test.each(["No", "backdrop", "Escape"])(
  "dismisses a lifecycle confirmation with %s after disconnection",
  async (dismiss) => {
    const user = userEvent.setup();
    const fetcher = stubApplicationUpdates();
    renderApplicationWorkspace({}, true);
    await user.click(screen.getByRole("button", { name: "Archive application" }));
    act(() => window.dispatchEvent(new Event("offline")));
    const dialog = screen.getByRole("alertdialog");
    expect(within(dialog).getByRole("button", { name: "Archive application" })).toBeDisabled();
    expect(within(dialog).getByRole("button", { name: "No" })).toBeEnabled();
    switch (dismiss) {
      case "Escape":
        await user.keyboard("{Escape}");
        break;
      case "backdrop":
        await user.click(screen.getAllByRole("button", { name: "No" })[0]);
        break;
      default:
        await user.click(within(dialog).getByRole("button", { name: "No" }));
    }
    expect(screen.queryByRole("alertdialog")).toBeNull();
    expect(screen.getByRole("navigation", { name: "Application actions" })).toHaveFocus();
    expect(fetcher).not.toHaveBeenCalled();
  },
);

function stubApplicationUpdates() {
  const application = createApplicationWorkspaceData().application;
  const fetcher = vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(
      new Response(
        JSON.stringify({
          data: {
            application: { ...application, ...JSON.parse(String(init?.body ?? "{}")) },
          },
        }),
        { status: 200 },
      ),
    ),
  );
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}

function readUpdateBodies(fetcher: ReturnType<typeof vi.fn>) {
  return fetcher.mock.calls
    .filter(([, init]) => init?.method === "PUT")
    .map(([, init]) => JSON.parse(String(init?.body)));
}
