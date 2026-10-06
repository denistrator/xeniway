import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, test } from "vitest";
import { Button } from "./button";

test("responsive and focus-visible overrides preserve base and independent styles", () => {
  render(
    <Button size="sm" className="md:h-12 md:px-6 focus-visible:ring-4 focus-visible:ring-focus">
      Save
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button).toHaveClass(
    "h-9",
    "px-3",
    "md:h-12",
    "md:px-6",
    "focus-visible:ring-4",
    "focus-visible:ring-focus",
    "focus-visible:outline-none",
  );
  expect(button).not.toHaveClass("focus-visible:ring-2", "focus-visible:ring-accent");
});

test("caller overrides preserve independent button styles", () => {
  render(
    <Button variant="outline" size="sm" className="h-12 px-6 text-muted">
      Save
    </Button>,
  );
  const button = screen.getByRole("button", { name: "Save" });
  expect(button).toHaveClass("h-12", "px-6", "text-muted", "text-sm", "border-line");
  expect(button).not.toHaveClass("h-9", "px-3", "text-ink");
});

test("asChild retains link semantics and caller overrides", () => {
  render(
    <Button asChild variant="ghost" size="icon" className="w-12">
      <a href="/archive">Archive</a>
    </Button>,
  );
  expect(screen.getByRole("link", { name: "Archive" })).toHaveAttribute("href", "/archive");
  expect(screen.getByRole("link", { name: "Archive" })).toHaveClass("w-12", "h-10");
});

test("default button forwards its ref and native disabled state", () => {
  const ref = createRef<HTMLButtonElement>();
  render(
    <Button ref={ref} disabled>
      Save
    </Button>,
  );
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(ref.current).toBe(screen.getByRole("button", { name: "Save" }));
});
