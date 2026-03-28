import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  fetchProjects,
  fetchReviews,
  fetchReview,
  updateFindingStatus,
} from "../../src/api/client";

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(data: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Not Found",
    json: () => Promise.resolve(data),
  };
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe("fetchProjects", () => {
  it("calls GET /api/v1/projects/ and returns data", async () => {
    const projects = [{ id: "1", name: "test" }];
    mockFetch.mockResolvedValue(jsonResponse(projects));

    const result = await fetchProjects();

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/projects/", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual(projects);
  });
});

describe("fetchReviews", () => {
  it("calls GET /api/v1/reviews/?project_id=:id", async () => {
    const reviews = [{ id: "r1" }];
    mockFetch.mockResolvedValue(jsonResponse(reviews));

    const result = await fetchReviews("p1");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/reviews/?project_id=p1", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual(reviews);
  });
});

describe("fetchReview", () => {
  it("calls GET /api/v1/reviews/:rid", async () => {
    const review = { id: "r1", findings: [] };
    mockFetch.mockResolvedValue(jsonResponse(review));

    const result = await fetchReview("r1");

    expect(mockFetch).toHaveBeenCalledWith("/api/v1/reviews/r1", {
      headers: { "Content-Type": "application/json" },
    });
    expect(result).toEqual(review);
  });
});

describe("updateFindingStatus", () => {
  it("calls PATCH with status body", async () => {
    const finding = { id: "f1", status: "accepted" };
    mockFetch.mockResolvedValue(jsonResponse(finding));

    const result = await updateFindingStatus("f1", "accepted");

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/v1/findings/f1",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "accepted" }),
      },
    );
    expect(result).toEqual(finding);
  });

  it("throws ApiError on non-ok response", async () => {
    mockFetch.mockResolvedValue(jsonResponse(null, 404));

    await expect(fetchProjects()).rejects.toThrow("Request failed");
  });
});
