export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100" aria-label={`${clamped}% complete`}>
      <div className="h-full rounded-full bg-emerald-600" style={{ width: `${clamped}%` }} />
    </div>
  );
}
