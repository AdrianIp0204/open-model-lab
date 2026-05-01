import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  compileRichMathExpression,
  RichInlineFormula,
  RichMathText,
} from "@/components/concepts/MathFormula";

describe("rich math formulas", () => {
  it("compiles mixed prose and math into a KaTeX-friendly expression", () => {
    const compiled = compileRichMathExpression("Use x(t) = A sin(\\omega t + \\phi).");

    expect(compiled).toContain("\\text{Use }");
    expect(compiled).toContain("x(t)");
    expect(compiled).toContain("\\sin");
    expect(compiled).toContain("\\omega");
    expect(compiled).toContain("\\phi");
  });

  it("renders mixed text and inline math without raw source tokens", () => {
    const { container } = render(
      <RichInlineFormula expression="Use x(t) = A sin(\\omega t + \\phi)." />,
    );

    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.textContent).toContain("Use");
    expect(container.textContent).not.toContain("\\omega");
    expect(container.textContent).not.toContain("\\phi");
  });

  it("renders mixed prose with explicit inline delimiters", () => {
    const { container } = render(
      <RichMathText content={"Use $x(t) = A\\sin(\\omega t + \\phi)$ at $t = 0$."} />,
    );

    expect(container.querySelector(".katex")).toBeInTheDocument();
    expect(container.textContent).toContain("Use");
    expect(container.textContent).not.toContain("\\omega");
    expect(container.textContent).not.toContain("\\phi");
  });
});
