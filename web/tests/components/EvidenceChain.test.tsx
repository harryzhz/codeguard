import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { EvidenceChain } from "../../src/components/EvidenceChain";
import type { EvidenceStep } from "../../src/api/client";

const steps: EvidenceStep[] = [
  { step: 1, observation: "Found vulnerable call", file: "src/auth.ts", line: 42, snippet: "eval(input)" },
  { step: 2, observation: "Input is unsanitized", file: "src/handler.ts", line: 10 },
  { step: 3, observation: "User data flows to eval" },
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
    expect(stepNums[0].style.backgroundColor).toBe("rgb(255, 240, 238)");
    expect(stepNums[0].style.borderRadius).toBe("50%");
  });

  it("renders file refs in muted color", () => {
    render(<EvidenceChain steps={steps} />);
    const fileRefs = screen.getAllByTestId("file-ref");
    expect(fileRefs).toHaveLength(2);
    expect(fileRefs[0]).toHaveTextContent("src/auth.ts:42");
    expect(fileRefs[0].style.color).toBe("rgb(170, 170, 170)");
  });

  it("renders code blocks with monospace on code-bg", () => {
    render(<EvidenceChain steps={steps} />);
    const codeBlock = screen.getByTestId("code-block");
    expect(codeBlock).toHaveTextContent("eval(input)");
    expect(codeBlock.style.fontFamily).toBe("monospace");
    expect(codeBlock.style.backgroundColor).toBe("rgb(247, 242, 242)");
  });

  it("renders gradient connectors between steps", () => {
    render(<EvidenceChain steps={steps} />);
    const connectors = screen.getAllByTestId("connector");
    expect(connectors).toHaveLength(2);
    expect(connectors[0].style.background).toBe("linear-gradient(to bottom, #FDD, #F7F2F2)");
  });
});
