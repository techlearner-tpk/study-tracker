export function Progress({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-stone-200" aria-label={`${clamped}% complete`}>
      <div className="h-full rounded-full bg-emerald-700" style={{ width: `${clamped}%` }} />
    </div>
  );
}

