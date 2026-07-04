import { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-700 disabled:pointer-events-none disabled:opacity-50",
        variant === "primary" && "bg-emerald-800 text-white hover:bg-emerald-900",
        variant === "secondary" && "border border-stone-300 bg-white text-stone-800 hover:bg-stone-100",
        variant === "ghost" && "text-stone-700 hover:bg-stone-100",
        variant === "danger" && "bg-red-700 text-white hover:bg-red-800",
        className,
      )}
      {...props}
    />
  );
}

