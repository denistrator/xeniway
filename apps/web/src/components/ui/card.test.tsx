import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

test("slot overrides stay local and preserve semantic typography", () => {
  render(
    <>
      <Card>
        <CardHeader className="p-2">
          <CardTitle className="text-muted text-xl">Applications</CardTitle>
        </CardHeader>
        <CardContent>Saved applications</CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Archive</CardTitle>
        </CardHeader>
      </Card>
    </>,
  );
  const title = screen.getByRole("heading", { name: "Applications" });
  expect(title).toHaveClass("text-muted", "text-xl", "font-semibold");
  expect(title).not.toHaveClass("text-ink", "text-lg");
  expect(title.parentElement).toHaveClass("p-2", "space-y-1.5");
  expect(title.parentElement).not.toHaveClass("p-6");
  expect(screen.getByText("Saved applications")).toHaveClass("p-6", "pt-0");
  const otherTitle = screen.getByRole("heading", { name: "Archive" });
  expect(otherTitle).toHaveClass("text-ink", "text-lg");
  expect(otherTitle.parentElement).toHaveClass("p-6");
});
