import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Layout constraint tests.
 *
 * These verify that the global stylesheet served to the browser contains
 * the visual constraints specified in the blueprint:
 *   max-width 480px, line-height 1.6, padding 20px.
 *
 * They work by reading the stylesheet source that Vite packages and serves —
 * the same file whose contents arrive in the user's browser.
 */
describe("Global stylesheet — layout constraints", () => {
  const css = readFileSync(
    join(process.cwd(), "src/app/styles.css"),
    "utf-8"
  );

  it("constrains the page body to a maximum width of 480px", () => {
    expect(css).toContain("max-width: 480px");
  });

  it("sets the body line-height to 1.6 for comfortable reading", () => {
    expect(css).toContain("line-height: 1.6");
  });

  it("adds 20px of padding around the body content", () => {
    expect(css).toContain("padding: 20px");
  });
});
