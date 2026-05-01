"use client";

import type { ReactNode } from "react";

type ChemistryNotationProps = {
  value: string;
  className?: string;
};

type ChemistryBlockNotationProps = ChemistryNotationProps & {
  label?: string;
};

const arrowTokens = {
  "->": "→",
  "<=>": "⇌",
  "⇌": "⇌",
} as const;

function joinClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function renderFormulaPiece(
  token: string,
  keyPrefix: string,
) {
  let stateSuffix = "";
  let chargeSuffix = "";
  let body = token;

  const stateMatch = body.match(/(\((?:aq|g|l|s)\))$/);
  if (stateMatch) {
    stateSuffix = stateMatch[1];
    body = body.slice(0, -stateSuffix.length);
  }

  const chargeMatch = body.match(/(\d*[+-])$/);
  if (chargeMatch && body !== chargeMatch[1]) {
    chargeSuffix = chargeMatch[1];
    body = body.slice(0, -chargeSuffix.length);
  }

  const pieces: ReactNode[] = [];
  let cursor = 0;
  let index = 0;

  const pushPiece = (value: ReactNode, type: string) => {
    pieces.push(
      <span key={`${keyPrefix}-${type}-${index}`} className="inline-flex items-baseline">
        {value}
      </span>,
    );
    index += 1;
  };

  while (cursor < body.length) {
    if (body.startsWith("R'", cursor)) {
      pushPiece(
        <>
          R<sup className="text-[0.72em] leading-none">′</sup>
        </>,
        "r-prime",
      );
      cursor += 2;
      continue;
    }

    const current = body[cursor];

    if (/[A-Z]/.test(current)) {
      let symbol = current;
      cursor += 1;
      if (/[a-z]/.test(body[cursor] ?? "")) {
        symbol += body[cursor];
        cursor += 1;
      }

      let subscript = "";
      while (cursor < body.length) {
        const nextChar = body[cursor];
        if (
          body.startsWith("R'", cursor) ||
          /[A-Z]/.test(nextChar) ||
          nextChar === "(" ||
          nextChar === ")" ||
          nextChar === "[" ||
          nextChar === "]" ||
          nextChar === "-" ||
          nextChar === "=" ||
          nextChar === ">"
        ) {
          break;
        }

        subscript += nextChar;
        cursor += 1;
      }

      pushPiece(
        <>
          <span>{symbol}</span>
          {subscript ? <sub className="text-[0.72em] leading-none">{subscript}</sub> : null}
        </>,
        "element",
      );
      continue;
    }

    pushPiece(current, "text");
    cursor += 1;
  }

  if (chargeSuffix) {
    pushPiece(<sup className="text-[0.72em] leading-none">{chargeSuffix}</sup>, "charge");
  }

  if (stateSuffix) {
    pushPiece(
      <span className="text-ink-600">{stateSuffix}</span>,
      "state",
    );
  }

  return pieces;
}

function renderNotationToken(token: string, index: number) {
  if (token in arrowTokens) {
    return (
      <span
        key={`arrow-${index}`}
        className="inline-flex items-center px-1 text-ink-700"
        aria-hidden="true"
      >
        {arrowTokens[token as keyof typeof arrowTokens]}
      </span>
    );
  }

  if (token === "+") {
    return (
      <span key={`plus-${index}`} className="inline-flex items-center px-1 text-ink-700">
        +
      </span>
    );
  }

  if (token === "=") {
    return (
      <span key={`equals-${index}`} className="inline-flex items-center px-1 text-ink-700">
        =
      </span>
    );
  }

  if (/^\s+$/.test(token)) {
    return (
      <span key={`space-${index}`} className="w-1.5" aria-hidden="true" />
    );
  }

  return (
    <span
      key={`formula-${index}`}
      className="inline-flex min-w-0 items-baseline gap-[0.04rem] whitespace-normal font-mono text-ink-950"
    >
      {renderFormulaPiece(token, `formula-${index}`)}
    </span>
  );
}

function tokenizeChemistryValue(value: string) {
  return value.split(/(\s+)/g).filter((token) => token.length > 0);
}

export function ChemistryInlineNotation({
  value,
  className,
}: ChemistryNotationProps) {
  const tokens = tokenizeChemistryValue(value);

  return (
    <span
      aria-label={value}
      data-chem-notation-source={value}
      className={joinClasses(
        "inline-flex max-w-full flex-wrap items-baseline gap-x-1 gap-y-1",
        className,
      )}
    >
      {tokens.map((token, index) => renderNotationToken(token, index))}
    </span>
  );
}

export function ChemistryBlockNotation({
  value,
  className,
  label,
}: ChemistryBlockNotationProps) {
  const tokens = tokenizeChemistryValue(value);

  return (
    <div
      aria-label={value}
      data-chem-notation-source={value}
      className={joinClasses("rounded-[18px] border border-line bg-paper px-3 py-3", className)}
    >
      {label ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-ink-600">
          {label}
        </p>
      ) : null}
      <div className="flex max-w-full flex-wrap items-baseline gap-x-1.5 gap-y-1.5 text-sm leading-7">
        {tokens.map((token, index) => renderNotationToken(token, index))}
      </div>
    </div>
  );
}
