import { render, screen } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { HomePage } from "@/app/pages/home";

describe("Personal homepage — content and links", () => {
  beforeEach(() => {
    render(<HomePage />);
  });

  // ── Heading ─────────────────────────────────────────────────────────────────

  it("displays the main heading with Peter's name", () => {
    expect(
      screen.getByRole("heading", { level: 1 })
    ).toHaveTextContent("Hi, my name is Peter.");
  });

  // ── Social links ─────────────────────────────────────────────────────────────

  it("includes a link to Twitter with visible text and correct destination", () => {
    const link = screen.getByRole("link", { name: "Twitter" });
    expect(link).toHaveAttribute("href", "https://twitter.com/appfactory/");
  });

  it("includes a link to GitHub with visible text and correct destination", () => {
    const link = screen.getByRole("link", { name: "GitHub" });
    expect(link).toHaveAttribute("href", "https://github.com/peterp/");
  });

  // ── Side projects ─────────────────────────────────────────────────────────────

  it("includes a Side Projects heading", () => {
    expect(
      screen.getByRole("heading", { name: /Side Projects/i })
    ).toBeInTheDocument();
  });

  it("includes a link to RedwoodJS with correct destination", () => {
    const link = screen.getByRole("link", { name: "RedwoodJS" });
    expect(link).toHaveAttribute("href", "https://redwoodjs.com");
  });

  it("includes a link to Machinen with correct destination", () => {
    const link = screen.getByRole("link", { name: "Machinen" });
    expect(link).toHaveAttribute("href", "https://machinen.dev");
  });

  it("includes a link to Blackspace with correct destination", () => {
    const link = screen.getByRole("link", { name: "Blackspace" });
    expect(link).toHaveAttribute("href", "https://github.com/peterp/Blackspace");
  });

  it("includes a link to Billable with correct destination", () => {
    const link = screen.getByRole("link", { name: "Billable" });
    expect(link).toHaveAttribute("href", "http://billable.me");
  });
});
