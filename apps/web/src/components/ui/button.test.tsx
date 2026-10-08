import { render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, test } from "vitest";
import { Button } from "./button.view";

test("asChild retains link semantics", () => {
  render(
    <Button asChild variant="ghost" size="icon">
      <a href="/archive">Archive</a>
    </Button>,
  );
  expect(screen.getByRole("link", { name: "Archive" })).toHaveAttribute("href", "/archive");
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
