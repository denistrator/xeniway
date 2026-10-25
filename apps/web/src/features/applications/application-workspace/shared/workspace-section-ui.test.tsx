import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../../../test/initialize-test-i18n";
import { WorkspaceMutationStatus } from "./workspace-section-ui.view";

beforeEach(async () => {
  await initializeTestI18n();
  vi.useFakeTimers();
});

afterEach(() => vi.useRealTimers());

test("successful workspace feedback expires and a later same-copy result is shown again", () => {
  const view = render(<WorkspaceMutationStatus pending={false} pendingText="Saving…" text="Saved." isError={false} />);
  act(() => vi.advanceTimersByTime(10_000));
  expect(screen.queryByText("Saved.")).not.toBeInTheDocument();
  view.rerender(<WorkspaceMutationStatus pending pendingText="Saving…" text={null} isError={false} />);
  view.rerender(<WorkspaceMutationStatus pending={false} pendingText="Saving…" text="Saved." isError={false} />);
  expect(screen.getByRole("status")).toHaveTextContent("Saved.");
});

test("workspace pending and failed states remain persistent", () => {
  const view = render(<WorkspaceMutationStatus pending pendingText="Saving…" text={null} isError={false} />);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByText("Saving…")).toBeVisible();
  view.rerender(<WorkspaceMutationStatus pending={false} pendingText="Saving…" text="Save failed." isError />);
  act(() => vi.advanceTimersByTime(20_000));
  expect(screen.getByRole("alert")).toHaveTextContent("Save failed.");
});
