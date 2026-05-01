import { createElement, type HTMLAttributes, type ReactNode } from "react";
import { pageSectionAnchorClassName } from "./page-section-nav";

type PageSectionProps = HTMLAttributes<HTMLElement> & {
  id: string;
  as?: "article" | "aside" | "div" | "section";
  children: ReactNode;
};

export function PageSection({
  as = "section",
  className = "",
  children,
  ...props
}: PageSectionProps) {
  return createElement(
    as,
    {
      ...props,
      className: [pageSectionAnchorClassName, className].join(" ").trim(),
    },
    children,
  );
}
