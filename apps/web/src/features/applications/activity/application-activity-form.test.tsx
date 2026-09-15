import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { changeLocale, initializeI18n } from "../../../i18n/i18n";
import { ApplicationActivityForm } from "./application-activity-form";

beforeEach(async () => {
  await initializeI18n();
  await changeLocale("en");
});

test("requires a title and submits a dated follow-up", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<ApplicationActivityForm onSubmit={onSubmit} onCancel={vi.fn()} />);

  expect(screen.getByRole("textbox", { name: "Title" })).toBeRequired();
  await user.selectOptions(screen.getByRole("combobox", { name: "Activity type" }), "follow_up");
  await user.type(screen.getByRole("textbox", { name: "Title" }), "Contact recruiter");
  await user.click(screen.getByRole("button", { name: "Save activity" }));

  expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ type: "follow_up", title: "Contact recruiter" }));
});

test("rejects whitespace-only titles", async () => {
  const user = userEvent.setup();
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<ApplicationActivityForm onSubmit={onSubmit} onCancel={vi.fn()} />);
  await user.type(screen.getByRole("textbox", { name: "Title" }), "   ");
  await user.click(screen.getByRole("button", { name: "Save activity" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Check the activity fields.");
  expect(onSubmit).not.toHaveBeenCalled();
});
