import { Children, type CSSProperties, type ReactNode } from "react";

type MotionStaggerGroupProps = {
  children: ReactNode;
  className?: string;
  itemClassName?: string;
  baseDelay?: number;
  stagger?: number;
  as?: "div" | "section";
};

export function MotionStaggerGroup({
  children,
  className,
  itemClassName,
  baseDelay = 0,
  stagger = 70,
  as = "div",
}: MotionStaggerGroupProps) {
  const Component = as;
  const items = Children.toArray(children);

  return (
    <Component className={className}>
      {items.map((child, index) => (
        <div
          key={index}
          className={itemClassName}
          style={
            {
              "--motion-delay": `${baseDelay + index * stagger}ms`,
            } as CSSProperties
          }
        >
          {child}
        </div>
      ))}
    </Component>
  );
}
