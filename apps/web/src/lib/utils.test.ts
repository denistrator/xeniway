import { expect, test } from "vitest";
import { cn } from "./utils";

test("caller padding replaces base padding", () => {
  expect(cn("px-4", "px-2")).toBe("px-2");
});

test("semantic color and font size survive together", () => {
  const classes = cn("text-sm text-ink", "text-muted").split(" ");
  expect(classes).toContain("text-sm");
  expect(classes).toContain("text-muted");
  expect(classes).not.toContain("text-ink");
});

test("responsive and state modifiers keep independent overrides", () => {
  const classes = cn("px-4 md:px-6 focus:ring-2", "md:px-2 focus:ring-0").split(" ");
  expect(classes).toEqual(["px-4", "md:px-2", "focus:ring-0"]);
});
