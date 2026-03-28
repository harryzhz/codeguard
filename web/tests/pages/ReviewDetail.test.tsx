import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewDetail } from "../../src/pages/ReviewDetail";

vi.mock("../../src/api/client", () => ({
  fetchReview: vi.fn(),
  updateFindingStatus: vi.fn(),
}));

import { fetchReview, updateFindingStatus } from "../../src/api/client";
const mockFetchReview = vi.mocked(fetchReview);
const mockUpdateFindingStatus = vi.mocked(updateFindingStatus);

const mockReview = {
  id: "r1",
  project_id: "p1",
  version: 1,
  summary: {
    files_reviewed: 3,
    total_findings: 2,
    critical: 1,
    warning: 1,
    style: 0,
    tests_run: 5,
    tests_passed: 4,
    tests_failed: 1,
  },
  files_changed: ["db.ts", "util.ts"],
  findings: [
    {
      id: "f1",
      review_id: "r1",
      title: "SQL Injection",
      description: "Bad query",
      severity: "critical" as const,
      status: "open" as const,
      confidence: 90,
      category: "security" as const,
      evidence_chain: [],
      test_verification: null,
      suggestion: "",
      created_at: new Date().toISOString(),
    },
    {
      id: "f2",
      review_id: "r1",
      title: "Missing null check",
      description: "Could be null",
      severity: "warning" as const,
      status: "open" as const,
      confidence: 75,
      category: "logic" as const,
      evidence_chain: [],
      test_verification: null,
      suggestion: "",
      created_at: new Date().toISOString(),
    },
  ],
  created_at: new Date().toISOString(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/projects/my-project/reviews/r1"]}>
      <Routes>
        <Route path="/projects/:projectName/reviews/:reviewId" element={<ReviewDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReviewDetail", () => {
  it("shows loading state", () => {
    mockFetchReview.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders summary bar and finding cards", async () => {
    mockFetchReview.mockResolvedValue(mockReview);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId("summary-bar")).toBeInTheDocument();
    });
    expect(screen.getAllByTestId("finding-card")).toHaveLength(2);
  });

  it("filters findings by severity", async () => {
    const user = userEvent.setup();
    mockFetchReview.mockResolvedValue(mockReview);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getAllByTestId("finding-card")).toHaveLength(2);
    });
    await user.click(screen.getByTestId("filter-critical"));
    expect(screen.getAllByTestId("finding-card")).toHaveLength(1);
    expect(screen.getByText("SQL Injection")).toBeInTheDocument();
  });

  it("shows no findings message when filter matches nothing", async () => {
    const user = userEvent.setup();
    mockFetchReview.mockResolvedValue(mockReview);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getAllByTestId("finding-card")).toHaveLength(2);
    });
    await user.click(screen.getByTestId("filter-style"));
    expect(screen.getByTestId("no-findings")).toBeInTheDocument();
  });

  it("calls updateFindingStatus on accept", async () => {
    const user = userEvent.setup();
    mockFetchReview.mockResolvedValue(mockReview);
    mockUpdateFindingStatus.mockResolvedValue({ ...mockReview.findings[0], status: "accepted" });
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getAllByTestId("finding-card")).toHaveLength(2);
    });
    // Expand first card
    await user.click(screen.getAllByTestId("finding-header")[0]);
    await user.click(screen.getByTestId("accept-btn"));
    expect(mockUpdateFindingStatus).toHaveBeenCalledWith("f1", "accepted");
  });

  it("shows error on fetch failure", async () => {
    mockFetchReview.mockRejectedValue(new Error("Not found"));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Not found");
    });
  });
});
