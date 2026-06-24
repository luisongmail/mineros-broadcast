import type { BatterStats } from '../types';

const statLabels = {
  avg: 'AVG',
  hits: 'H',
  rbi: 'RBI',
  today: 'HOY',
  obp: 'OBP',
  slg: 'SLG',
} as const;

export interface StatsGridProps {
  stats?: BatterStats;
  className?: string;
}

export function StatsGrid({ stats, className = '' }: StatsGridProps) {
  if (!stats) {
    return null;
  }

  const entries: Array<{ label: string; value: string }> = [];

  if (stats.avg !== undefined) {
    entries.push({ label: statLabels.avg, value: stats.avg });
  }

  if (stats.hits !== undefined) {
    entries.push({ label: statLabels.hits, value: String(stats.hits) });
  }

  if (stats.rbi !== undefined) {
    entries.push({ label: statLabels.rbi, value: String(stats.rbi) });
  }

  if (stats.today !== undefined) {
    entries.push({ label: statLabels.today, value: stats.today });
  }

  if (stats.obp !== undefined) {
    entries.push({ label: statLabels.obp, value: stats.obp });
  }

  if (stats.slg !== undefined) {
    entries.push({ label: statLabels.slg, value: stats.slg });
  }

  if (entries.length === 0) {
    return null;
  }

  return (
    <dl className={['flex flex-wrap items-center gap-x-4 gap-y-2 font-inter text-sm text-white/90', className].filter(Boolean).join(' ')}>
      {entries.map((entry) => (
        <div className="flex items-baseline gap-2" key={entry.label}>
          <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/65">{entry.label}</dt>
          <dd className="text-base font-semibold leading-none text-white">{entry.value}</dd>
        </div>
      ))}
    </dl>
  );
}
