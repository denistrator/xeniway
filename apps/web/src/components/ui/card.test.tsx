import { fireEvent, render, screen } from "@testing-library/react";
import { createRef } from "react";
import { expect, test, vi } from "vitest";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./card.view";

test("preserves native elements, attributes, children, and refs", () => {
  const cardRef = createRef<HTMLDivElement>();
  const headerRef = createRef<HTMLDivElement>();
  const titleRef = createRef<HTMLHeadingElement>();
  const descriptionRef = createRef<HTMLParagraphElement>();
  const contentRef = createRef<HTMLDivElement>();

  const view = render(
    <Card ref={cardRef} aria-labelledby="card-title" id="application-card">
      <CardHeader ref={headerRef}>
        <CardTitle ref={titleRef} id="card-title">
          Application details
        </CardTitle>
        <CardDescription ref={descriptionRef}>Your employer conversation</CardDescription>
      </CardHeader>
      <CardContent ref={contentRef} tabIndex={-1}>
        Saved preparation
      </CardContent>
    </Card>,
  );

  expect(cardRef.current?.tagName).toBe("DIV");
  expect(cardRef.current).toHaveAttribute("id", "application-card");
  expect(cardRef.current).toHaveAttribute("aria-labelledby", "card-title");
  expect(headerRef.current?.tagName).toBe("DIV");
  expect(titleRef.current).toBe(screen.getByRole("heading", { level: 2, name: "Application details" }));
  expect(descriptionRef.current?.tagName).toBe("P");
  expect(descriptionRef.current).toHaveTextContent("Your employer conversation");
  expect(contentRef.current?.tagName).toBe("DIV");
  expect(contentRef.current).toHaveTextContent("Saved preparation");
  contentRef.current?.focus();
  expect(contentRef.current).toHaveFocus();

  view.unmount();
  expect(cardRef.current).toBeNull();
  expect(headerRef.current).toBeNull();
  expect(titleRef.current).toBeNull();
  expect(descriptionRef.current).toBeNull();
  expect(contentRef.current).toBeNull();
});

test("passes native event handlers through to the element", () => {
  const handleClick = vi.fn();
  render(<Card onClick={handleClick}>Application details</Card>);

  fireEvent.click(screen.getByText("Application details"));

  expect(handleClick).toHaveBeenCalledOnce();
});
