"use client";

import { cn } from "@/lib/utils";
import type { ColorChoice } from "@/lib/subject-colors";

export function ColorSwatchField({
  label,
  name,
  value,
  options,
  className,
  helperText,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  options: ColorChoice[];
  className?: string;
  helperText?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={cn("grid gap-2", className)}>
      <div>
        <p className="text-sm font-medium text-stone-900">{label}</p>
        {helperText ? <p className="mt-1 text-xs text-stone-500">{helperText}</p> : null}
      </div>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              title={option.label}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-md border transition",
                selected ? "border-stone-900 ring-2 ring-stone-300" : "border-stone-200 hover:border-stone-400",
              )}
              style={{ backgroundColor: option.value }}
              aria-pressed={selected}
            >
              <span className="sr-only">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
