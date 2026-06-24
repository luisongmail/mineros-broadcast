import type { PitcherStats as PitcherStatsData } from '../types';

const metricConfig = [
  { key: 'ip', label: 'IP' },
  { key: 'pitches', label: 'PIT' },
  { key: 'strikeouts', label: 'K' },
  { key: 'walks', label: 'BB' },
  { key: 'era', label: 'ERA' },
] as const;

export interface PitcherStatsProps {
  stats?: PitcherStatsData;
}

export function PitcherStats({ stats }: PitcherStatsProps) {
  if (!stats) {
    return null;
  }

  const hasLastPitch = Boolean(stats.lastPitch || stats.lastPitchSpeed);

  return (
    <div className="flex flex-1 items-stretch border-l border-white/10 bg-mineros-dark/80 text-white">
      {metricConfig.map((metric) => {
        const rawValue = stats[metric.key];
        const value = rawValue === undefined ? '—' : String(rawValue);

        return (
          <div className="flex min-w-[92px] flex-1 flex-col justify-center gap-2 border-r border-white/10 px-4 py-4" key={metric.key}>
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">{metric.label}</span>
            <span className="font-bebas text-[34px] leading-none text-white">{value}</span>
          </div>
        );
      })}
      {hasLastPitch && (
        <div className="flex min-w-[140px] flex-col justify-center gap-2 px-4 py-4">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/65">ÚLTIMO</span>
          <span className="font-bebas text-[30px] leading-none text-white">{stats.lastPitch ?? '—'}</span>
          {stats.lastPitchSpeed && <span className="font-inter text-sm font-semibold uppercase tracking-[0.12em] text-mineros-gold">{stats.lastPitchSpeed}</span>}
        </div>
      )}
    </div>
  );
}
