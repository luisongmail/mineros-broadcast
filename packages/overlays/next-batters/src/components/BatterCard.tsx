import { StateLabel } from './StateLabel';
import type { NextBatterEntry } from '../types';

interface BatterCardProps {
  batter: NextBatterEntry;
  photoUrl?: string;
}

export function BatterCard({ batter, photoUrl }: BatterCardProps) {
  return (
    <article
      data-testid={`batter-card-${batter.state}`}
      data-batter-state={batter.state}
      className={[
        'flex min-w-[200px] flex-1 flex-col gap-3 rounded-[8px] border px-4 py-3 shadow-[0px_6px_16px_rgba(0,0,0,0.28)]',
        batter.state === 'current'
          ? 'border-mineros-red bg-mineros-red/15'
          : 'border-mineros-gold/40 bg-broadcast-black/40',
      ].join(' ')}
    >
      {/* Header: estado + turno */}
      <div className="flex items-center justify-between gap-2">
        <StateLabel state={batter.state} />
        <span className="rounded-[4px] border border-white/10 bg-white/5 px-2 py-0.5 font-bebas text-[16px] leading-none text-mineros-gold">
          #{batter.order}
        </span>
      </div>

      {/* Foto + nombre en fila */}
      <div className="flex items-center gap-3">
        <div className="flex h-[72px] w-[56px] shrink-0 items-center justify-center overflow-hidden rounded-[6px] bg-white/10">
          {photoUrl ? (
            <img src={photoUrl} alt={batter.name} className="h-full w-full object-cover" />
          ) : (
            <span className="font-bebas text-[18px] uppercase text-white/40">
              {batter.number ?? '?'}
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-bebas text-[22px] uppercase leading-none tracking-[0.04em] text-white">{batter.name}</h3>
          {batter.number && (
            <span className="font-bebas text-[16px] leading-none text-mineros-gold">#{batter.number}</span>
          )}
        </div>
      </div>

      {/* Stats: posición · avg · hoy */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {batter.position && (
          <span className="rounded-[3px] border border-white/15 bg-white/5 px-2 py-0.5 font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-white/80">
            {batter.position}
          </span>
        )}
        {batter.avg && (
          <span className="font-inter text-[12px] font-semibold text-white/70">
            AVG <span className="text-mineros-gold">{batter.avg}</span>
          </span>
        )}
        {batter.today && (
          <span className="font-inter text-[12px] font-semibold text-white/70">
            HOY <span className="text-white">{batter.today}</span>
          </span>
        )}
        {batter.bats && (
          <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.1em] text-white/50">
            BATEA {batter.bats}
          </span>
        )}
      </div>
    </article>
  );
}
