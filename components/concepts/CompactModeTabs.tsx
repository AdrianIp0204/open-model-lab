"use client";

export type CompactModeTab = {
  id: string;
  label: string;
  note?: string;
};

type CompactModeTabsProps = {
  items: CompactModeTab[];
  activeId: string;
  onChange: (id: string) => void;
  className?: string;
  ariaLabel: string;
};

export function CompactModeTabs({
  items,
  activeId,
  onChange,
  className,
  ariaLabel,
}: CompactModeTabsProps) {
  return (
    <div
      className={["inline-flex rounded-full border border-line bg-paper-strong p-1 text-xs font-semibold uppercase tracking-[0.18em] text-ink-600", className ?? ""].join(" ")}
      role="tablist"
      aria-label={ariaLabel}
    >
      {items.map((item) => {
        const selected = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={[
              "rounded-full px-3 py-1.5 transition",
              selected ? "bg-teal-500 text-white shadow-sm" : "hover:text-ink-900",
            ].join(" ")}
            onClick={() => onChange(item.id)}
          >
            <span className="block">{item.label}</span>
            {item.note ? <span className="block text-[0.68rem] opacity-80">{item.note}</span> : null}
          </button>
        );
      })}
    </div>
  );
}
