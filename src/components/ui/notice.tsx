type NoticeProps = {
  tone?: "success" | "error" | "info";
  children: React.ReactNode;
};

export function Notice({ tone = "info", children }: NoticeProps) {
  const styles =
    tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "error"
        ? "border-red-200 bg-red-50 text-red-900"
        : "border-stone-200 bg-stone-50 text-stone-800";

  return <div className={`rounded-md border px-3 py-2 text-sm ${styles}`}>{children}</div>;
}
