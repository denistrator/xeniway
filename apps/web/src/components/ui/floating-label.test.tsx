import { Mail } from "lucide-react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { FloatingLabel } from "./floating-label";

describe("FloatingLabel", () => {
  test("associates the label with its control", () => {
    const markup = renderToStaticMarkup(
      <FloatingLabel htmlFor="email" label="Email">
        <input id="email" />
      </FloatingLabel>,
    );

    expect(markup).toContain('for="email"');
    expect(markup).toContain("Email</label>");
    expect(markup).toContain('<input id="email"');
  });

  test("renders an optional decorative icon", () => {
    const markup = renderToStaticMarkup(
      <FloatingLabel htmlFor="email" label="Email" icon={Mail}>
        <input id="email" />
      </FloatingLabel>,
    );

    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain('focusable="false"');
  });
});
