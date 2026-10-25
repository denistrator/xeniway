import { act, fireEvent, render, screen } from "@testing-library/react";
import { createRef, StrictMode, useLayoutEffect, useState } from "react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { initializeTestI18n } from "../../test/initialize-test-i18n";
import { InfoMessage } from "./info-message.view";

beforeEach(async () => {
  await initializeTestI18n();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

test("expires after ten seconds without rendering countdown text or announcing the progress", () => {
  render(<InfoMessage messageId="saved">Saved.</InfoMessage>);
  expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  expect(screen.getByRole("button", { name: "Close message" })).toBeVisible();
  expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  expect(screen.queryByText(/closes in|10s/i)).not.toBeInTheDocument();
  advance(9999);
  expect(screen.getByRole("status")).toHaveTextContent("Saved.");
  advance(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("hover pauses the remaining time instead of restarting it", () => {
  render(<InfoMessage messageId="saved">Saved.</InfoMessage>);
  advance(4255);
  fireEvent.mouseEnter(screen.getByRole("status"));
  advance(20_000);
  expect(screen.getByRole("status")).toBeVisible();
  fireEvent.mouseLeave(screen.getByRole("status"));
  advance(5744);
  expect(screen.getByRole("status")).toBeVisible();
  advance(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("overlapping hover and focus pauses only resume when both end", () => {
  render(
    <>
      <InfoMessage messageId="saved">Saved.</InfoMessage>
      <button type="button">Elsewhere</button>
    </>,
  );
  advance(3000);
  fireEvent.mouseEnter(screen.getByRole("status"));
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  fireEvent.mouseLeave(screen.getByRole("status"));
  advance(20_000);
  expect(screen.getByRole("status")).toBeVisible();
  act(() => screen.getByRole("button", { name: "Elsewhere" }).focus());
  advance(6999);
  expect(screen.getByRole("status")).toBeVisible();
  advance(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("focus moving between notice controls does not resume the timer", () => {
  render(
    <InfoMessage messageId="saved">
      Saved. <a href="/settings">Settings</a>
    </InfoMessage>,
  );
  act(() => screen.getByRole("link").focus());
  advance(10_000);
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  advance(10_000);
  expect(screen.getByRole("status")).toBeVisible();
});

test("hidden tabs preserve the remaining duration, including a notice mounted while hidden", () => {
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
  render(<InfoMessage messageId="saved">Saved.</InfoMessage>);
  advance(20_000);
  expect(screen.getByRole("status")).toBeVisible();
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  advance(3000);
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  advance(20_000);
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  advance(6999);
  expect(screen.getByRole("status")).toBeVisible();
  advance(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});

test("returning to a visible tab does not override an interaction pause", () => {
  const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  render(<InfoMessage messageId="saved">Saved.</InfoMessage>);
  advance(2000);
  fireEvent.mouseEnter(screen.getByRole("status"));
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  hidden.mockReturnValue(true);
  fireEvent(document, new Event("visibilitychange"));
  hidden.mockReturnValue(false);
  fireEvent(document, new Event("visibilitychange"));
  advance(20_000);
  expect(screen.getByRole("status")).toBeVisible();
  fireEvent.mouseLeave(screen.getByRole("status"));
  advance(20_000);
  expect(screen.getByRole("status")).toBeVisible();
});

test("a rerender or updated text/callback does not restart the same occurrence", () => {
  const original = vi.fn();
  const latest = vi.fn();
  const id = {};
  const view = render(
    <InfoMessage messageId={id} onDismiss={original}>
      Saved.
    </InfoMessage>,
  );
  advance(9000);
  view.rerender(
    <InfoMessage messageId={id} onDismiss={latest}>
      Сохранено.
    </InfoMessage>,
  );
  advance(1000);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(original).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledOnce();
});

test("a new same-copy occurrence gets ten seconds and ignores the previous deadline", () => {
  const view = render(<InfoMessage messageId={1}>Saved.</InfoMessage>);
  advance(9000);
  view.rerender(<InfoMessage messageId={2}>Saved.</InfoMessage>);
  advance(1000);
  expect(screen.getByRole("status")).toBeVisible();
  advance(8999);
  expect(screen.getByRole("status")).toBeVisible();
  advance(1);
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  view.rerender(<InfoMessage messageId={3}>Saved.</InfoMessage>);
  expect(screen.getByRole("status")).toBeVisible();
});

test("an old deadline cannot dismiss a replacement committed before effect cleanup", () => {
  const schedule = vi.spyOn(window, "setTimeout");
  const dismiss = vi.fn();
  let oldDeadline = () => {};

  function Fixture({ id }: { id: number }) {
    useLayoutEffect(() => {
      if (id === 2) {
        oldDeadline();
      }
    }, [id]);
    return (
      <InfoMessage messageId={id} onDismiss={dismiss}>
        Saved.
      </InfoMessage>
    );
  }

  const view = render(<Fixture id={1} />);
  const handler = schedule.mock.calls.find(([, delay]) => delay === 10_000)?.[0];
  if (typeof handler !== "function") {
    throw new Error("Expected the original message deadline.");
  }
  oldDeadline = () => handler();
  view.rerender(<Fixture id={2} />);
  expect(dismiss).not.toHaveBeenCalled();
  expect(screen.getByRole("status")).toBeVisible();
  advance(10_000);
  expect(dismiss).toHaveBeenCalledOnce();
});

test("manual close uses main content when the caller target is detached", async () => {
  const target = { current: document.createElement("button") };
  render(
    <>
      <main id="main-content" tabIndex={-1}>
        Content
      </main>
      <InfoMessage messageId="saved" returnFocusRef={target}>
        Saved.
      </InfoMessage>
    </>,
  );
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close message" })));
  expect(screen.getByRole("main")).toHaveFocus();
});

test("manual close resolves its focus destination after the caller handles dismissal", async () => {
  function Fixture() {
    const target = createRef<HTMLButtonElement>();
    const [showTarget, setShowTarget] = useState(true);
    function dismiss() {
      setShowTarget(false);
    }
    return (
      <>
        <main id="main-content" tabIndex={-1}>
          Content
        </main>
        {showTarget && (
          <button ref={target} type="button">
            Preference
          </button>
        )}
        <InfoMessage messageId="saved" returnFocusRef={target} onDismiss={dismiss}>
          Saved.
        </InfoMessage>
      </>
    );
  }
  render(<Fixture />);
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close message" })));
  expect(screen.queryByRole("button", { name: "Preference" })).not.toBeInTheDocument();
  expect(screen.getByRole("main")).toHaveFocus();
});

test("manual close returns focus to the caller and only dismisses once", async () => {
  const target = createRef<HTMLButtonElement>();
  const dismiss = vi.fn();
  render(
    <>
      <button ref={target} type="button">
        Preference
      </button>
      <InfoMessage messageId="saved" returnFocusRef={target} onDismiss={dismiss}>
        Saved.
      </InfoMessage>
    </>,
  );
  act(() => screen.getByRole("button", { name: "Close message" }).focus());
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Close message" })));
  expect(screen.queryByRole("status")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Preference" })).toHaveFocus();
  advance(20_000);
  expect(dismiss).toHaveBeenCalledOnce();
  fireEvent(document, new Event("visibilitychange"));
  advance(20_000);
  expect(dismiss).toHaveBeenCalledOnce();
});

test("automatic expiry does not move focus away from unrelated work", () => {
  const target = createRef<HTMLButtonElement>();
  render(
    <>
      <input aria-label="Draft" />
      <button ref={target} type="button">
        Preference
      </button>
      <main id="main-content" tabIndex={-1}>
        Content
      </main>
      <InfoMessage messageId="saved" returnFocusRef={target}>
        Saved.
      </InfoMessage>
    </>,
  );
  act(() => screen.getByRole("textbox").focus());
  advance(10_000);
  expect(screen.getByRole("textbox")).toHaveFocus();
});

test("dismissal removes the visibility listener even while the component stays mounted", () => {
  const subscribe = vi.spyOn(document, "addEventListener");
  const unsubscribe = vi.spyOn(document, "removeEventListener");
  render(<InfoMessage messageId="saved">Saved.</InfoMessage>);
  const listener = subscribe.mock.calls.find(([name]) => name === "visibilitychange")?.[1];
  expect(listener).toBeTypeOf("function");
  advance(10_000);
  expect(unsubscribe).toHaveBeenCalledWith("visibilitychange", listener);
});

test("StrictMode cleanup prevents duplicate expiry and unmounted callbacks", () => {
  const dismiss = vi.fn();
  const view = render(
    <StrictMode>
      <InfoMessage messageId="saved" onDismiss={dismiss}>
        Saved.
      </InfoMessage>
    </StrictMode>,
  );
  advance(10_000);
  expect(dismiss).toHaveBeenCalledOnce();
  view.rerender(
    <StrictMode>
      <InfoMessage messageId="new" onDismiss={dismiss}>
        Saved.
      </InfoMessage>
    </StrictMode>,
  );
  view.unmount();
  advance(20_000);
  expect(dismiss).toHaveBeenCalledOnce();
});
