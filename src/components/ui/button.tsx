"use client";

import { ButtonHTMLAttributes } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  pendingText?: string;
};

export function Button({ children, className, disabled, pendingText, type, variant = "primary", ...props }: ButtonProps) {
  const { pending } = useFormStatus();
  const isSubmit = type === "submit" || !type;
  const isPending = isSubmit && pending;

  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600 disabled:pointer-events-none disabled:opacity-60",
        variant === "primary" && "bg-emerald-700 text-white shadow-sm hover:bg-emerald-800",
        variant === "secondary" && "border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-emerald-50 hover:text-emerald-800",
        variant === "ghost" && "text-slate-700 hover:bg-emerald-50 hover:text-emerald-800",
        variant === "danger" && "bg-red-700 text-white shadow-sm hover:bg-red-800",
        className,
      )}
      disabled={disabled || isPending}
      type={type}
      {...props}
    >
      {isPending ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" /> : null}
      {isPending && pendingText ? pendingText : children}
    </button>
  );
}
