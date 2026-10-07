import { afterEach, expect, test } from "vitest";
import { trapTabFocus } from "./trap-tab-focus";

afterEach(() => document.body.replaceChildren());

function createDialog() {
  const dialog = document.createElement("section");
  const first = document.createElement("button");
  const middle = document.createElement("input");
  const last = document.createElement("button");
  dialog.append(first, middle, last);
  document.body.append(dialog);
  return { dialog, first, middle, last };
}

test.each([
  { shiftKey: false, start: "last", target: "first" },
  { shiftKey: true, start: "first", target: "last" },
] as const)("wraps focus from $start to $target", ({ shiftKey, start, target }) => {
  const controls = createDialog();
  controls[start].focus();
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, cancelable: true });

  trapTabFocus(event, controls.dialog);

  expect(document.activeElement).toBe(controls[target]);
  expect(event.defaultPrevented).toBe(true);
});

test.each([false, true])("leaves ordinary Tab navigation alone with Shift=%s", (shiftKey) => {
  const { dialog, middle } = createDialog();
  middle.focus();
  const event = new KeyboardEvent("keydown", { key: "Tab", shiftKey, cancelable: true });

  trapTabFocus(event, dialog);

  expect(document.activeElement).toBe(middle);
  expect(event.defaultPrevented).toBe(false);
});

test("ignores disabled controls at the focus boundary", () => {
  const { dialog, first, middle, last } = createDialog();
  first.disabled = true;
  last.focus();
  const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

  trapTabFocus(event, dialog);

  expect(document.activeElement).toBe(middle);
  expect(event.defaultPrevented).toBe(true);
});

test("does not intercept Tab when there are no focusable controls", () => {
  const dialog = document.createElement("section");
  const event = new KeyboardEvent("keydown", { key: "Tab", cancelable: true });

  trapTabFocus(event, dialog);

  expect(event.defaultPrevented).toBe(false);
});
