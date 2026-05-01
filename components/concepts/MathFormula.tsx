import type { ElementType, ReactNode } from "react";
import katex from "katex";

type MathFormulaProps = {
  expression: string;
  displayMode?: boolean;
  className?: string;
};

type RichMathTextProps<T extends ElementType = "span"> = {
  content: string;
  as?: T;
  id?: string;
  className?: string;
  ariaLabel?: string;
};

type MathSegment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; displayMode: boolean };

const inlineMathWords: Record<string, string> = {
  sin: "\\sin",
  cos: "\\cos",
  tan: "\\tan",
  cot: "\\cot",
  sec: "\\sec",
  csc: "\\csc",
  ln: "\\ln",
  log: "\\log",
  exp: "\\exp",
  sqrt: "\\sqrt",
};

const mathIdentifiers = new Set([
  "x",
  "y",
  "z",
  "t",
  "v",
  "a",
  "g",
  "m",
  "k",
  "A",
  "B",
  "C",
  "E",
  "F",
  "P",
  "Q",
  "R",
  "T",
  "L",
  "n",
  "N",
  "S",
  "I",
  "J",
]);

const tokenPattern = /\\[a-zA-Z]+|[A-Za-z][A-Za-z0-9_]*|[0-9]+(?:\.[0-9]+)?|[=+\-*/^(),.:;!?]|\s+|./g;

function escapeLatexText(value: string) {
  return value
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/([{}$&#_^%~])/g, "\\$1");
}

function toMathToken(token: string) {
  if (/^\\[a-zA-Z]+$/.test(token)) {
    return token;
  }

  const functionMatch = token.match(/^(sin|cos|tan|cot|sec|csc|ln|log|exp|sqrt)\((.*)\)$/);
  if (functionMatch) {
    return `\\${functionMatch[1]}(${functionMatch[2]})`;
  }

  const mappedWord = inlineMathWords[token];
  if (mappedWord) {
    return mappedWord;
  }

  if (/^[=+\-*/^(),.:;!?]$/.test(token)) {
    return token;
  }

  if (/^[0-9]+(?:\.[0-9]+)?$/.test(token)) {
    return token;
  }

  if (mathIdentifiers.has(token) || /^[A-Za-z][A-Za-z0-9_]*_[A-Za-z0-9]+$/.test(token)) {
    return token;
  }

  return null;
}

export function compileRichMathExpression(expression: string) {
  const output: string[] = [];
  let buffer = "";
  let bufferMode: "text" | "math" | null = null;

  function flushBuffer() {
    if (!buffer) {
      return;
    }

    if (bufferMode === "text") {
      const normalized = buffer.replace(/\s+/g, " ");
      if (normalized.trim()) {
        output.push(`\\text{${escapeLatexText(normalized)}}`);
      }
    } else if (bufferMode === "math") {
      output.push(buffer.replace(/\s+/g, " "));
    }

    buffer = "";
    bufferMode = null;
  }

  for (const token of expression.match(tokenPattern) ?? []) {
    if (/^\s+$/.test(token)) {
      if (bufferMode) {
        buffer += " ";
      }
      continue;
    }

    const mathToken = toMathToken(token);
    if (mathToken) {
      if (bufferMode === "text") {
        flushBuffer();
      }
      bufferMode = "math";
      buffer += mathToken;
      continue;
    }

    if (bufferMode === "math") {
      flushBuffer();
    }
    bufferMode = "text";
    buffer += token;
  }

  flushBuffer();
  return output.join(" ");
}

function renderMath(expression: string, displayMode: boolean) {
  return katex.renderToString(expression, {
    displayMode,
    output: "html",
    strict: "ignore",
    throwOnError: false,
  });
}

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function parseMathSegments(content: string): MathSegment[] {
  const segments: MathSegment[] = [];
  let cursor = 0;

  while (cursor < content.length) {
    const delimiter = content.startsWith("$$", cursor) ? "$$" : content[cursor] === "$" ? "$" : null;

    if (!delimiter) {
      const nextMath = content.indexOf("$", cursor);
      const text = nextMath === -1 ? content.slice(cursor) : content.slice(cursor, nextMath);

      if (text) {
        segments.push({ type: "text", value: text });
      }

      if (nextMath === -1) {
        break;
      }

      cursor = nextMath;
      continue;
    }

    const closingIndex = content.indexOf(delimiter, cursor + delimiter.length);
    if (closingIndex === -1) {
      segments.push({ type: "text", value: content.slice(cursor) });
      break;
    }

    const expression = content
      .slice(cursor + delimiter.length, closingIndex)
      .trim();

    if (expression) {
      segments.push({
        type: "math",
        value: expression,
        displayMode: delimiter === "$$",
      });
    }

    cursor = closingIndex + delimiter.length;
  }

  return segments.length > 0 ? segments : [{ type: "text", value: content }];
}

function buildMathNodes(content: string) {
  return parseMathSegments(content).map<ReactNode>((segment, index) => {
    if (segment.type === "text") {
      return <span key={`text-${index}`}>{segment.value}</span>;
    }

    if (segment.displayMode) {
      return (
        <BlockFormula
          key={`block-${index}`}
          expression={segment.value}
          className="my-3 overflow-x-auto"
        />
      );
    }

    return <InlineFormula key={`inline-${index}`} expression={segment.value} />;
  });
}

export function InlineFormula({ expression, className }: Omit<MathFormulaProps, "displayMode">) {
  return (
    <span
      className={joinClasses("math-inline", className)}
      dangerouslySetInnerHTML={{ __html: renderMath(expression, false) }}
    />
  );
}

export function BlockFormula({ expression, className }: Omit<MathFormulaProps, "displayMode">) {
  return (
    <div
      className={joinClasses("math-block", className)}
      dangerouslySetInnerHTML={{ __html: renderMath(expression, true) }}
    />
  );
}

export function RichMathText<T extends ElementType = "span">({
  content,
  as,
  id,
  className,
  ariaLabel,
}: RichMathTextProps<T>) {
  const Component = (as ?? "span") as ElementType;

  return (
    <Component
      id={id}
      className={joinClasses("min-w-0", className)}
      aria-label={ariaLabel}
    >
      {buildMathNodes(content)}
    </Component>
  );
}

export function RichInlineFormula({ expression, className }: Omit<MathFormulaProps, "displayMode">) {
  return <InlineFormula expression={compileRichMathExpression(expression)} className={className} />;
}

export function RichBlockFormula({ expression, className }: Omit<MathFormulaProps, "displayMode">) {
  return <BlockFormula expression={compileRichMathExpression(expression)} className={className} />;
}
