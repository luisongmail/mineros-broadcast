import { LineupHeader } from './components/LineupHeader';
import { LineupRow } from './components/LineupRow';
import { PitcherRow } from './components/PitcherRow';
import type { LineupOverlayProps, LineupPlayer } from './types';

const baseDiamondClass = 'absolute h-[18px] w-[18px] rotate-45 rounded-[2px] border border-white/25 bg-white/10';

const defensivePositionClasses: Record<string, string> = {
  P: 'left-[116px] top-[122px]',
  C: 'left-[116px] top-[222px]',
  '1B': 'left-[188px] top-[154px]',
  '2B': 'left-[142px] top-[96px]',
  '3B': 'left-[44px] top-[154px]',
  SS: 'left-[86px] top-[96px]',
  LF: 'left-[18px] top-[52px]',
  CF: 'left-[116px] top-[20px]',
  RF: 'left-[214px] top-[52px]',
};

function resolveAssetUrl(assetBaseUrl: string | undefined, assetId: string | undefined) {
  if (!assetBaseUrl || !assetId) {
    return undefined;
  }

  return `${assetBaseUrl.replace(/\/$/, '')}/${assetId}`;
}

function DiamondMarker({ player }: { player: LineupPlayer }) {
  const positionClass = player.position ? defensivePositionClasses[player.position.toUpperCase()] : undefined;

  if (!positionClass) {
    return null;
  }

  return (
    <div className={`absolute ${positionClass} flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 text-center`}>
      <span aria-hidden="true" className={`${baseDiamondClass} left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2`} />
      <span className="relative rounded-[4px] border border-mineros-gold/40 bg-mineros-navy px-2 py-1 font-bebas text-[15px] uppercase leading-none tracking-[0.08em] text-white">
        {player.position}
      </span>
      <span className="max-w-[90px] truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-white/85">{player.name}</span>
    </div>
  );
}

export function LineupOverlay({ team, players, pitcher, assetBaseUrl }: LineupOverlayProps) {
  const activeDefenders = players.filter((player) => player.status === 'active');
  const logoUrl = resolveAssetUrl(assetBaseUrl, team.logoAssetId);

  return (
    <section className="mb-shell relative h-[1080px] w-[1920px] overflow-hidden bg-transparent font-inter text-white">
      <div className="absolute left-[60px] top-[110px] flex w-[920px] gap-5 rounded-[8px] border border-mineros-gold bg-mineros-navy/90 p-6 shadow-[0px_12px_32px_rgba(0,0,0,0.38)]">
        <div className="min-w-0 flex-1">
          <LineupHeader team={team} logoUrl={logoUrl} />

          <div className="mt-5 grid grid-cols-[64px_84px_72px_minmax(0,1fr)_88px_88px] gap-3 border-b border-white/10 pb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
            <span>Ord</span>
            <span>Foto</span>
            <span>#</span>
            <span>Nombre</span>
            <span>Pos</span>
            <span className="text-right">AVG</span>
          </div>

          <div className="mt-3 flex flex-col gap-2">
            {players.map((player) => (
              <LineupRow
                key={player.playerId}
                player={player}
                photoUrl={resolveAssetUrl(assetBaseUrl, player.photoAssetId)}
              />
            ))}
          </div>

          {pitcher && <PitcherRow pitcher={pitcher} photoUrl={resolveAssetUrl(assetBaseUrl, pitcher.photoAssetId)} />}
        </div>

        <aside className="w-[250px] shrink-0 rounded-[6px] border border-white/10 bg-broadcast-black/35 p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mineros-gold">Defensa</p>
          <div className="mt-4 rounded-[6px] border border-white/10 bg-mineros-dark/70 p-4">
            <div className="relative mx-auto h-[250px] w-[250px]" aria-label="Posicion defensiva en diamante">
              <span aria-hidden="true" className={`${baseDiamondClass} left-[116px] top-[182px]`} />
              <span aria-hidden="true" className={`${baseDiamondClass} left-[62px] top-[128px]`} />
              <span aria-hidden="true" className={`${baseDiamondClass} left-[170px] top-[128px]`} />
              <span aria-hidden="true" className={`${baseDiamondClass} left-[116px] top-[74px]`} />
              {activeDefenders.map((player) => (
                <DiamondMarker key={`${player.playerId}-diamond`} player={player} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
