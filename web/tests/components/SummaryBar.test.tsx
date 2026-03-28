import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SummaryBar } from "../../src/components/SummaryBar";

const summary = {
  files_reviewed: 5,
  total_findings: 10,
  critical: 2,
  warning: 5,
  style: 3,
  tests_run: 8,
  tests_passed: 7,
  tests_failed: 1,
};

describe("SummaryBar", () => {
  it("renders total findings count", () => {
    render(<SummaryBar summary={summary} />);
    expect(screen.getByTestId("total-count")).toHaveTextContent("10 findings");
  });

  it("renders severity counts", () => {
    render(<SummaryBar summary={summary} />);
    expect(screen.getByTestId("critical-count")).toHaveTextContent("2 critical");
    expect(screen.getByTestId("warning-count")).toHaveTextContent("5 warning");
    expect(screen.getByTestId("style-count")).toHaveTextContent("3 style");
  });

  it("renders children slot", () => {
    render(
      <SummaryBar summary={summary}>
        <button>Filter</button>
      </SummaryBar>,
    );
    expect(screen.getByText("Filter")).toBeInTheDocument();
  });

  it("does not render children wrapper when no children", () => {
    const { container } = render(<SummaryBar summary={summary} />);
    const bar = container.querySelector("[data-testid='summary-bar']")!;
    expect(bar.children).toHaveLength(1);
  });
});
