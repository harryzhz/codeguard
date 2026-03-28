import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ProjectList } from "../../src/pages/ProjectList";

vi.mock("../../src/api/client", () => ({
  fetchProjects: vi.fn(),
}));

import { fetchProjects } from "../../src/api/client";
const mockFetchProjects = vi.mocked(fetchProjects);

beforeEach(() => {
  vi.clearAllMocks();
});

function renderWithRouter() {
  return render(
    <MemoryRouter>
      <ProjectList />
    </MemoryRouter>,
  );
}

describe("ProjectList", () => {
  it("shows loading state initially", () => {
    mockFetchProjects.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("renders project cards after loading", async () => {
    mockFetchProjects.mockResolvedValue([
      {
        id: "p1",
        name: "My Project",
        created_at: new Date().toISOString(),
      },
    ]);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("My Project")).toBeInTheDocument();
    });
    expect(screen.getByTestId("project-card")).toBeInTheDocument();
  });

  it("shows error on fetch failure", async () => {
    mockFetchProjects.mockRejectedValue(new Error("Network error"));
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByTestId("error")).toHaveTextContent("Network error");
    });
  });
});
