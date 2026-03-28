import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SeverityFilter } from "../../src/components/SeverityFilter";

describe("SeverityFilter", () => {
  it("renders all four buttons", () => {
    render(<SeverityFilter value="all" onChange={() => {}} />);
    expect(screen.getByTestId("filter-all")).toBeInTheDocument();
    expect(screen.getByTestId("filter-critical")).toBeInTheDocument();
    expect(screen.getByTestId("filter-warning")).toBeInTheDocument();
    expect(screen.getByTestId("filter-style")).toBeInTheDocument();
  });

  it("highlights active button with teal background", () => {
    render(<SeverityFilter value="critical" onChange={() => {}} />);
    const active = screen.getByTestId("filter-critical");
    expect(active.style.backgroundColor).toBe("rgb(26, 26, 26)");
    expect(active.style.color).toBe("rgb(255, 255, 255)");
  });

  it("inactive buttons are transparent", () => {
    render(<SeverityFilter value="critical" onChange={() => {}} />);
    const inactive = screen.getByTestId("filter-all");
    expect(inactive.style.backgroundColor).toBe("transparent");
  });

  it("calls onChange when a button is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SeverityFilter value="all" onChange={onChange} />);
    await user.click(screen.getByTestId("filter-warning"));
    expect(onChange).toHaveBeenCalledWith("warning");
  });
});
