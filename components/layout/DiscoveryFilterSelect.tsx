"use client";

type DiscoveryFilterSelectProps = {
  label: string;
  value: string;
  options: Array<{
    value: string;
    label: string;
    count?: number;
  }>;
  onChange: (nextValue: string) => void;
  ariaSuffix?: string;
  helperText?: string;
};

export function DiscoveryFilterSelect({
  label,
  value,
  options,
  onChange,
  ariaSuffix = "filter",
  helperText,
}: DiscoveryFilterSelectProps) {
  return (
    <label className="space-y-2">
      <span className="lab-label">{label}</span>
      <div className="relative">
        <select
          aria-label={`${label} ${ariaSuffix}`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full appearance-none rounded-[20px] border border-line bg-paper-strong px-4 py-3 text-sm text-ink-950 outline-none transition-colors focus:border-teal-500"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {typeof option.count === "number"
                ? `${option.label} (${option.count})`
                : option.label}
            </option>
          ))}
        </select>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm text-ink-500"
        >
          &gt;
        </span>
      </div>
      {helperText ? <p className="text-sm leading-6 text-ink-600">{helperText}</p> : null}
    </label>
  );
}
