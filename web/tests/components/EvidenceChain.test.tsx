import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvidenceChain } from "../../src/components/EvidenceChain";
import type { EvidenceStep } from "../../src/api/client";

const steps: EvidenceStep[] = [
  { step: 1, description: "Found vulnerable call", file: "src/auth.ts", line: 42, code: "eval(input)" },
  { step: 2, description: "Input is unsanitized", file: "src/handler.ts", line: 10 },
  { step: 3, description: "User data flows to eval" },
];

describe("EvidenceChain", () => {
  it("renders nothing for empty steps", () => {
    const { container } = render(<EvidenceChain steps={[]} />);
    expect(container.innerHTML).toBe("");
  });

  it("renders step numbers in rounded squares", () => {
    render(<EvidenceChain steps={steps} />);
    const stepNums = screen.getAllByTestId("step-number");
    expect(stepNums).toHaveLength(3);
    expect(stepNums[0]).toHaveTextContent("1");
    expect(stepNums[0].style.backgroundColor).toBe("rgb(235, 245, 243)");
    expect(stepNums[0].style.borderRadius).toBe("6px");
  });

  it("renders file refs in teal", () => {
    render(<EvidenceChain steps={steps} />);
    const fileRefs = screen.getAllByTestId("file-ref");
    expect(fileRefs).toHaveLength(2);
    expect(fileRefs[0]).toHaveTextContent("src/auth.ts:42");
    expect(fileRefs[0].style.color).toBe("rgb(45, 122, 111)");
  });

  it("renders code blocks with monospace on code-bg", () => {
    render(<EvidenceChain steps={steps} />);
    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock).toHaveTextContent("eval(input)");
    expect(codeBlock.style.fontFamily).toBe("monospace");
    expect(codeBlock.style.backgroundColor).toBe("rgb(245, 243, 239)");
  });

  it("renders dashed connectors between steps", () => {
    render(<EvidenceChain steps={steps} />);
    const connectors = screen.getAllByTestId("connector");
    expect(connectors).toHaveLength(2);
    expect(connectors[0].style.borderLeft).toBe("2px dashed rgb(214, 229, 226)");
  });
});
