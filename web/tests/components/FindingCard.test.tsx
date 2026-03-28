import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FindingCard } from "../../src/components/FindingCard";
import type { Finding } from "../../src/api/client";

const baseFinding: Finding = {
  id: "f1",
  title: "SQL Injection",
  description: "Unsanitized input in query",
  severity: "critical",
  status: "open",
  confidence: 92,
  file: "src/db.ts",
  line: 55,
  suggestion: "Use parameterized queries",
  evidence: [
    { step: 1, description: "User input flows to query", file: "src/db.ts", line: 55 },
  ],
  test_verification: {
    description: "Verified with malicious input",
    status: "pass",
  },
};

describe("FindingCard", () => {
  it("renders collapsed by default with title and confidence", () => {
    render(<FindingCard finding={baseFinding} />);
    expect(screen.getByText("SQL Injection")).toBeInTheDocument();
    expect(screen.getByTestId("confidence")).toHaveTextContent("92% confidence");
    expect(screen.queryByTestId("finding-body")).not.toBeInTheDocument();
  });

  it("expands on header click", async () => {
    const user = userEvent.setup();
    render(<FindingCard finding={baseFinding} />);
    await user.click(screen.getByTestId("finding-header"));
    expect(screen.getByTestId("finding-body")).toBeInTheDocument();
    expect(screen.getByText("Unsanitized input in query")).toBeInTheDocument();
  });

  it("shows evidence chain when expanded", async () => {
    const user = userEvent.setup();
    render(<FindingCard finding={baseFinding} />);
    await user.click(screen.getByTestId("finding-header"));
    expect(screen.getByTestId("evidence-chain")).toBeInTheDocument();
  });

  it("shows test verification when expanded", async () => {
    const user = userEvent.setup();
    render(<FindingCard finding={baseFinding} />);
    await user.click(screen.getByTestId("finding-header"));
    expect(screen.getByTestId("test-verification")).toBeInTheDocument();
    expect(screen.getByText(/Verified with malicious input/)).toBeInTheDocument();
  });

  it("shows suggestion when expanded", async () => {
    const user = userEvent.setup();
    render(<FindingCard finding={baseFinding} />);
    await user.click(screen.getByTestId("finding-header"));
    expect(screen.getByTestId("suggestion")).toBeInTheDocument();
  });

  it("calls onAccept when Accept is clicked", async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(<FindingCard finding={baseFinding} onAccept={onAccept} />);
    await user.click(screen.getByTestId("finding-header"));
    await user.click(screen.getByTestId("accept-btn"));
    expect(onAccept).toHaveBeenCalledWith("f1");
  });

  it("calls onDismiss when Dismiss is clicked", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(<FindingCard finding={baseFinding} onDismiss={onDismiss} />);
    await user.click(screen.getByTestId("finding-header"));
    await user.click(screen.getByTestId("dismiss-btn"));
    expect(onDismiss).toHaveBeenCalledWith("f1");
  });

  it("hides action buttons when status is not open", async () => {
    const user = userEvent.setup();
    const accepted = { ...baseFinding, status: "accepted" as const };
    render(<FindingCard finding={accepted} />);
    await user.click(screen.getByTestId("finding-header"));
    expect(screen.queryByTestId("accept-btn")).not.toBeInTheDocument();
    expect(screen.queryByTestId("dismiss-btn")).not.toBeInTheDocument();
  });

  it("has correct left border color for critical severity", () => {
    render(<FindingCard finding={baseFinding} />);
    const card = screen.getByTestId("finding-card");
    expect(card.style.borderLeft).toContain("rgb(209, 69, 59)");
  });
});
