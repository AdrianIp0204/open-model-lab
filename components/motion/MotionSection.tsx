import type { CSSProperties, ReactNode } from "react";

type MotionSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "article" | "aside";
  id?: string;
};

export function MotionSection({
  children,
  className,
  delay = 0,
  as = "div",
  id,
}: MotionSectionProps) {
  const Component = as;

  return (
    <Component
      id={id}
      className={["motion-enter", className].filter(Boolean).join(" ")}
      style={{ "--motion-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </Component>
  );
}
