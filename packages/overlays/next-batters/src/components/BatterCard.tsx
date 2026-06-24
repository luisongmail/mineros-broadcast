import { StateLabel } from './StateLabel';
import type { NextBatterEntry } from '../types';

interface BatterCardProps {
  batter: NextBatterEntry;
  photoUrl?: string;
}

export function BatterCard({ batter, photoUrl }: BatterCardProps) {
  const details = [
    batter.position,
    batter.avg ? `AVG ${batter.avg}` : undefined,
    batter.bats ? `BATEA ${batter.bats}` : undefined,
  ].filter(Boolean) as string[];

  return (
    <article
      data-testid={`batter-card-${batter.state}`}
      data-batter-state={batter.state}
      className={[
        'flex min-h-[248px] min-w-[220px] flex-1 flex-col rounded-[8px] border px-4 py-4 shadow-[0px_10px_24px_rgba(0,0,0,0.24)]',
        batter.state === 'current'
          ? 'border-mineros-red bg-mineros-red/18'
          : 'border-mineros-gold/40 bg-broadcast-black/35',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-3">
        <StateLabel state={batter.state} />
        <span className="rounded-[4px] border border-white/10 bg-white/5 px-2 py-1 font-bebas text-[18px] leading-none text-mineros-gold">
          {batter.order}
        </span>
      </div>

      <div className="mt-4 flex h-[112px] w-full items-center justify-center overflow-hidden rounded-[6px] bg-white/10">
        {photoUrl ? (
          <img src={photoUrl} alt={batter.name} className="h-full w-full object-cover" />
        ) : (
          <div data-testid="photo-placeholder" className="flex flex-col items-center gap-2 text-white/70">
            <span className="font-bebas text-[20px] uppercase tracking-[0.1em]">Foto</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em]">Sin asset</span>
          </div>
        )}
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <h3 className="min-w-0 truncate font-bebas text-[30px] uppercase leading-none tracking-[0.05em] text-white">{batter.name}</h3>
        {batter.number && <span className="font-bebas text-[28px] leading-none text-mineros-gold">#{batter.number}</span>}
      </div>

      {details.length > 0 && (
        <p className="mt-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-white/85">{details.join(' · ')}</p>
      )}
    </article>
  );
}
