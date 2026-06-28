type StatusPillTone = 'neutral' | 'success' | 'warning';

type StatusPillProps = {
  label: string;
  value: string;
  tone?: StatusPillTone;
};

const TONE_STYLES: Record<StatusPillTone, string> = {
  neutral: 'border-white/10 bg-white/5 text-white/80',
  success: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  warning: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
};

export function StatusPill({ label, value, tone = 'neutral' }: StatusPillProps) {
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs ${TONE_STYLES[tone]}`}>
      <span className="uppercase tracking-[0.16em] text-white/45">{label}</span>
      <span className="font-semibold text-current">{value}</span>
    </div>
  );
}
