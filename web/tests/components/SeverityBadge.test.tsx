import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "../../src/components/SeverityBadge";

describe("SeverityBadge", () => {
  it("renders critical badge with correct colors", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("critical");
    expect(badge.style.color).toBe("rgb(212, 74, 58)");
    expect(badge.style.backgroundColor).toBe("rgb(255, 240, 238)");
  });

  it("renders warning badge", () => {
    render(<SeverityBadge severity="warning" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("warning");
    expect(badge.style.color).toBe("rgb(184, 134, 11)");
  });

  it("renders style badge", () => {
    render(<SeverityBadge severity="style" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("style");
    expect(badge.style.color).toBe("rgb(91, 143, 185)");
  });

  it("has correct border radius and font size", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge.style.borderRadius).toBe("20px");
    expect(badge.style.fontSize).toBe("11px");
  });
});
