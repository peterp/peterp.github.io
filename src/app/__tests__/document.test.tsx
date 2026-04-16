import { renderToString } from "react-dom/server";
import { describe, it, expect } from "vitest";
import { Document } from "@/app/document";

/**
 * Document wrapper tests.
 *
 * The Document component is the HTML shell that wraps every page. These tests
 * verify the metadata visible to the user (and search engines) without
 * exercising any page-specific content.
 */
describe("Document wrapper — page metadata", () => {
  it("sets the browser tab title to the site owner's name", () => {
    const html = renderToString(<Document>{null}</Document>);
    expect(html).toContain("Peter Pistorius");
  });
});
