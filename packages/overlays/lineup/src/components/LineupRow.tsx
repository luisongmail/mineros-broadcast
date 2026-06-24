import type { LineupPlayer } from '../types';

interface LineupRowProps {
  player: LineupPlayer;
  photoUrl?: string;
}

export function LineupRow({ player, photoUrl }: LineupRowProps) {
  const statusClass =
    player.status === 'substituted'
      ? 'opacity-60'
      : player.status === 'ejected'
        ? 'opacity-45'
        : '';

  return (
    <article
      data-testid="lineup-row"
      data-current-batter={player.isCurrentBatter ? 'true' : 'false'}
      data-player-status={player.status}
      className={[
        'grid grid-cols-[64px_84px_72px_minmax(0,1fr)_88px_88px] items-center gap-3 rounded-[6px] border border-white/8 px-3 py-2.5 transition-colors',
        player.isCurrentBatter ? 'border-mineros-red bg-mineros-red/20' : 'bg-broadcast-black/25',
        statusClass,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <span className="font-bebas text-[28px] leading-none text-mineros-gold">{player.order}</span>

      <div className="flex h-[54px] w-[72px] items-center justify-center overflow-hidden rounded-[6px] bg-white/10">
        {photoUrl ? (
          <img src={photoUrl} alt={player.name} className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Foto</span>
        )}
      </div>

      <span className="font-bebas text-[26px] leading-none text-white">{player.number ?? '—'}</span>

      <div className="min-w-0">
        <p className="truncate font-bebas text-[24px] uppercase leading-none tracking-[0.05em] text-white">{player.name}</p>
        {player.status !== 'active' && (
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">{player.status}</p>
        )}
      </div>

      <span className="text-[13px] font-semibold uppercase tracking-[0.12em] text-white/80">{player.position ?? ''}</span>
      <span className="text-right text-[13px] font-semibold uppercase tracking-[0.08em] text-mineros-gold">{player.avg ? `AVG ${player.avg}` : ''}</span>
    </article>
  );
}
