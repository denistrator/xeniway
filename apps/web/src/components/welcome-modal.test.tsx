import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import { initializeI18n } from "../i18n/i18n";
import { WelcomeModal } from "./welcome-modal";

beforeEach(async () => {
  await initializeI18n();
});

test("renders the localized introduction and completion actions", () => {
  render(<WelcomeModal onComplete={vi.fn()} />);

  expect(screen.getByRole("dialog", { name: "Welcome to Xenia Way" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Go to board" })).toBeVisible();
  expect(screen.getByRole("button", { name: "About Xenia Way" })).toBeVisible();
  expect(screen.getByRole("button", { name: "Language: English. Change language" })).toBeVisible();
});

test("completes on close, backdrop, or Escape", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn().mockResolvedValue(undefined);
  const { rerender } = render(<WelcomeModal onComplete={onComplete} />);

  await user.click(
    screen.getByRole("dialog").querySelector("button[aria-label='Close welcome introduction']") as HTMLElement,
  );
  expect(onComplete).toHaveBeenLastCalledWith("stay");

  rerender(<WelcomeModal onComplete={onComplete} />);
  await user.keyboard("{Escape}");
  expect(onComplete).toHaveBeenLastCalledWith("stay");

  rerender(<WelcomeModal onComplete={onComplete} />);
  await user.click(screen.getByRole("dialog").previousElementSibling as HTMLElement);
  expect(onComplete).toHaveBeenLastCalledWith("stay");
});

test("routes the board and About actions through the completion callback", async () => {
  const user = userEvent.setup();
  const onComplete = vi.fn().mockResolvedValue(undefined);
  render(<WelcomeModal onComplete={onComplete} />);

  await user.click(screen.getByRole("button", { name: "Go to board" }));
  expect(onComplete).toHaveBeenCalledWith("board");
  await user.click(screen.getByRole("button", { name: "About Xenia Way" }));
  expect(onComplete).toHaveBeenCalledWith("about");
});
