import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SeverityBadge } from "../../src/components/SeverityBadge";

describe("SeverityBadge", () => {
  it("renders critical badge with correct colors", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("critical");
    expect(badge.style.color).toBe("rgb(209, 69, 59)");
    expect(badge.style.backgroundColor).toBe("rgb(253, 236, 235)");
  });

  it("renders warning badge", () => {
    render(<SeverityBadge severity="warning" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("warning");
    expect(badge.style.color).toBe("rgb(198, 139, 0)");
  });

  it("renders style badge", () => {
    render(<SeverityBadge severity="style" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge).toHaveTextContent("style");
    expect(badge.style.color).toBe("rgb(122, 117, 112)");
  });

  it("has correct border radius and font size", () => {
    render(<SeverityBadge severity="critical" />);
    const badge = screen.getByTestId("severity-badge");
    expect(badge.style.borderRadius).toBe("6px");
    expect(badge.style.fontSize).toBe("11px");
  });
});
