type MeterBarProps = {
  label: string;
  count: number;
  max: number;
};

export function MeterBar({ label, count, max }: MeterBarProps) {
  const width = max > 0 ? `${Math.max((count / max) * 100, count > 0 ? 8 : 0)}%` : "0%";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="font-semibold text-ink">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-paper">
        <div className="h-full rounded-full bg-rust" style={{ width }} />
      </div>
    </div>
  );
}
