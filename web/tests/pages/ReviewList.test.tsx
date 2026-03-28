import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReviewList } from "../../src/pages/ReviewList";

vi.mock("../../src/api/client", () => ({
  fetchReviews: vi.fn(),
}));

import { fetchReviews } from "../../src/api/client";
const mockFetchReviews = vi.mocked(fetchReviews);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderWithRouter(projectId = "p1") {
  return render(
    <MemoryRouter initialEntries={[`/projects/${projectId}/reviews`]}>
      <Routes>
        <Route path="/projects/:projectId/reviews" element={<ReviewList />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ReviewList", () => {
  it("shows loading state", () => {
    mockFetchReviews.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders review cards after loading", async () => {
    mockFetchReviews.mockResolvedValue([
      {
        id: "r1",
        project_id: "p1",
        commit_sha: "abc12345def",
        branch: "main",
        status: "completed",
        summary: { total: 3, critical: 1, warning: 1, style: 1 },
        findings: [],
        created_at: new Date().toISOString(),
      },
    ]);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("main")).toBeInTheDocument();
    });
    expect(screen.getByTestId("review-card")).toBeInTheDocument();
    expect(screen.getByText("3 findings")).toBeInTheDocument();
  });

  it("shows error on failure", async () => {
    mockFetchReviews.mockRejectedValue(new Error("Fetch error"));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Fetch error");
    });
  });
});
