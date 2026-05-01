import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  compileRichMathExpression,
  formatMathExpressionForAccessibleText,
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

  it("adds readable labels for rendered formulas", () => {
    const expression = "n(\\lambda) \\approx n_{\\mathrm{ref}} + D\\left[\\left(\\dfrac{550}{\\lambda}\\right)^2 - 1\\right]";
    const { container } = render(<RichMathText content={`Use $${expression}$ now.`} />);
    const formula = container.querySelector(".math-inline");

    expect(formatMathExpressionForAccessibleText(expression)).toContain("550 over lambda");
    expect(formula).toHaveAttribute("role", "math");
    expect(formula).toHaveAttribute(
      "aria-label",
      "n(lambda) approximately n sub ref + D[(550 over lambda) squared - 1]",
    );
  });
});
