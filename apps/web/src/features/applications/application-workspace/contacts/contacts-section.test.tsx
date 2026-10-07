import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { workspaceContact } from "../test-support/application-workspace-fixtures";
import { renderApplicationWorkspace } from "../test-support/render-application-workspace";

beforeEach(async () => {
  vi.restoreAllMocks();
  await initializeTestI18n();
});

afterEach(() => vi.unstubAllGlobals());

test.each([
  { label: "Name", type: "text", autoComplete: "name", maxLength: "255" },
  { label: "Role", type: "text", autoComplete: "off", maxLength: "255" },
  { label: "Email", type: "email", autoComplete: "email", maxLength: "255" },
  { label: "Phone", type: "tel", autoComplete: "tel", maxLength: "100" },
  { label: "Profile URL", type: "url", autoComplete: "off", maxLength: "500" },
])("preserves input attributes for $label", async ({ label, type, autoComplete, maxLength }) => {
  const user = userEvent.setup();
  renderApplicationWorkspace();
  await user.click(screen.getByRole("button", { name: "Add contact" }));
  const input = screen.getByRole("textbox", { name: label });
  expect(input).toHaveAttribute("type", type);
  expect(input).toHaveAttribute("autocomplete", autoComplete);
  expect(input).toHaveAttribute("maxlength", maxLength);
});

test("contacts show safe links, plain notes, and an actionable empty state", () => {
  renderApplicationWorkspace({ contacts: [workspaceContact] });
  expect(screen.getByRole("link", { name: "ari@example.com" })).toHaveAttribute("href", "mailto:ari@example.com");
  expect(screen.getByRole("link", { name: "+1 212 555 0123" })).toHaveAttribute("href", "tel:+12125550123");
  expect(screen.getByRole("link", { name: "Profile for Ari Cole" })).toHaveAttribute("rel", "noopener noreferrer");
  expect(screen.getByRole("link", { name: "Profile for Ari Cole" })).toHaveAttribute("href", "https://example.com/ari");
});

test("contacts do not turn invalid stored profile URLs into links", () => {
  renderApplicationWorkspace({
    contacts: [{ ...workspaceContact, profileUrl: "javascript:alert(1)", notes: "<script>text</script>" }],
  });
  expect(screen.queryByRole("link", { name: "Profile for Ari Cole" })).toBeNull();
  expect(screen.getByText("<script>text</script>")).toBeVisible();
  expect(document.querySelector("script")).toBeNull();
});

test("contacts validate required fields and save a new contact", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { contact: workspaceContact } }), { status: 201 }));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ contacts: [] });
  expect(screen.getByText("No contacts yet. Add someone you may speak with.")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Add contact" }));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  expect(screen.getByText("Name is required.")).toBeVisible();
  expect(screen.getByText("Role is required.")).toBeVisible();
  const nameField = screen.getByRole("textbox", { name: "Name" });
  const roleField = screen.getByRole("textbox", { name: "Role" });
  expect(nameField).toHaveAttribute("aria-invalid", "true");
  expect(document.getElementById(nameField.getAttribute("aria-describedby") ?? "")).toHaveTextContent(
    "Name is required.",
  );
  expect(roleField).toHaveAttribute("aria-invalid", "true");
  await user.type(nameField, "Ari Cole");
  await user.type(roleField, "Recruiter");
  await user.type(screen.getByRole("textbox", { name: "Email" }), "not-an-email");
  await user.type(screen.getByRole("textbox", { name: "Profile URL" }), "javascript:alert(1)");
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  expect(screen.getByText("Enter a valid email address.")).toBeVisible();
  expect(screen.getByText("Enter a valid HTTP or HTTPS profile URL.")).toBeVisible();
  expect(screen.getByRole("textbox", { name: "Email" })).toHaveAttribute("aria-invalid", "true");
  expect(screen.getByRole("textbox", { name: "Profile URL" })).toHaveAttribute("aria-invalid", "true");
  await user.clear(screen.getByRole("textbox", { name: "Email" }));
  await user.clear(screen.getByRole("textbox", { name: "Profile URL" }));
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({
    name: "Ari Cole",
    role: "Recruiter",
    profileUrl: null,
  });
  expect(await screen.findByText("Contact saved.")).toBeVisible();
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Add contact" })));
});

test("contacts edit, cancel, confirm removal, and announce server errors", async () => {
  const user = userEvent.setup();
  const fetcher = vi.fn().mockResolvedValueOnce(new Response("", { status: 500 }));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ contacts: [workspaceContact] });
  await user.click(screen.getByRole("button", { name: "Edit Ari Cole" }));
  await user.clear(screen.getByRole("textbox", { name: "Role" }));
  await user.type(screen.getByRole("textbox", { name: "Role" }), "Lead recruiter");
  await user.click(screen.getByRole("button", { name: "Cancel" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Ari Cole" })));
  expect(screen.getByText("Recruiter")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "Remove Ari Cole" }));
  expect(screen.getByRole("alertdialog")).toBeVisible();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "No" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Ari Cole" })));
  expect(fetcher).not.toHaveBeenCalled();
  await user.click(screen.getByRole("button", { name: "Remove Ari Cole" }));
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Yes" }));
  expect(await screen.findByRole("alert")).toHaveTextContent("Could not remove contact.");
});

test("closing a contact removal confirmation while editing restores focus to its trigger", async () => {
  const user = userEvent.setup();
  renderApplicationWorkspace({ contacts: [workspaceContact] });
  await user.click(screen.getByRole("button", { name: "Edit Ari Cole" }));
  await user.click(screen.getByRole("button", { name: "Remove Ari Cole" }));
  expect(screen.queryByRole("textbox", { name: "Name" })).toBeNull();
  await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "No" }));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Remove Ari Cole" })));
});

test("contacts save edits through the owned contact endpoint", async () => {
  const user = userEvent.setup();
  const fetcher = vi
    .fn()
    .mockResolvedValue(new Response(JSON.stringify({ data: { contact: workspaceContact } }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  renderApplicationWorkspace({ contacts: [workspaceContact] });
  await user.click(screen.getByRole("button", { name: "Edit Ari Cole" }));
  expect(document.activeElement).toBe(screen.getByRole("textbox", { name: "Name" }));
  await user.clear(screen.getByRole("textbox", { name: "Role" }));
  await user.type(screen.getByRole("textbox", { name: "Role" }), "Hiring manager");
  await user.click(screen.getByRole("button", { name: "Save contact" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
  await waitFor(() => expect(document.activeElement).toBe(screen.getByRole("button", { name: "Edit Ari Cole" })));
  expect(fetcher.mock.calls[0][0]).toContain("/applications/3/contacts/7");
  expect(fetcher.mock.calls[0][1].method).toBe("PATCH");
  expect(JSON.parse(fetcher.mock.calls[0][1].body)).toMatchObject({ role: "Hiring manager" });
});
