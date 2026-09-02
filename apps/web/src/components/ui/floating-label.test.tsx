import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { FloatingLabel } from "./floating-label";

describe("FloatingLabel", () => {
  test("renders the control before its associated label", () => {
    const markup = renderToStaticMarkup(
      <FloatingLabel htmlFor="email" label="Email" className="w-64" labelClassName="text-xs">
        <input id="email" className="peer" />
      </FloatingLabel>,
    );

    expect(markup).toContain('class="floating-label w-64"');
    expect(markup).toContain('<label for="email" class="floating-label-label text-xs">Email</label>');
    expect(markup.indexOf('<input id="email"')).toBeLessThan(markup.indexOf("<label"));
  });
});
