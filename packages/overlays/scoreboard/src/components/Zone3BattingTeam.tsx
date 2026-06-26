import { TeamBadge } from './TeamBadge';
import type { ScoreboardNextBatter, ScoreboardOverlayData } from '../types';

function toRows(nextBatters: ScoreboardNextBatter[]) {
  const rows = [...nextBatters.slice(0, 3)];
  while (rows.length < 3) {
    rows.push({
      order: rows.length + 1,
      playerId: `placeholder-${rows.length + 1}`,
      playerName: 'POR DEFINIR',
    });
  }
  return rows;
}

function statValue(value: string | number | undefined) {
  return value ?? '-';
}

export function Zone3BattingTeam({ data, assetBaseUrl }: { data: ScoreboardOverlayData; assetBaseUrl?: string }) {
  const rows = toRows(data.nextBatters);

  return (
    <section className="flex h-full flex-col overflow-hidden rounded-[6px] border border-white/8 bg-[#111111] px-4 py-3 shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
      <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">Equipo al bate · Próximos bateadores</div>
      <div className="mt-2 flex items-center gap-3 rounded-[6px] border border-white/8 bg-[#1B2F5B]/70 px-4 py-2">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[6px] bg-[#1B2F5B] ring-1 ring-[#D4AF37]/40">
          <TeamBadge abbr={data.battingTeam.abbr} assetBaseUrl={assetBaseUrl} logoAssetId={data.battingTeam.logoAssetId} size="md" />
        </div>
        <div>
          <div className="font-bebas text-[24px] uppercase leading-none tracking-[0.04em] text-white">{data.battingTeam.displayName}</div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#D4AF37]">Al bate</div>
        </div>
      </div>

      {/* Encabezado de tabla */}
      <div className="mt-2 grid grid-cols-[52px_68px_minmax(0,1fr)_72px_48px_56px_76px] rounded-[6px] border border-white/8 bg-white/5 px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
        <div>Ord</div>
        <div>#</div>
        <div>Jugador</div>
        <div>AVG</div>
        <div>H</div>
        <div>RBI</div>
        <div className="text-[#D4AF37]">Hoy</div>
      </div>

      {/* 3 filas de bateadores — siempre se muestran */}
      <div className="mt-1 flex flex-1 flex-col gap-1">
        {rows.map((batter) => (
          <div
            key={`${batter.playerId}-${batter.order}`}
            className="grid flex-1 grid-cols-[52px_68px_minmax(0,1fr)_72px_48px_56px_76px] items-center rounded-[6px] border border-white/8 bg-black/20 px-2 py-1.5"
          >
            <div>
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-[4px] bg-[#1B2F5B] font-bebas text-[20px] leading-none text-white ring-1 ring-[#D4AF37]/30">
                {batter.order}
              </span>
            </div>
            <div className="font-bebas text-[20px] leading-none text-white">{batter.playerNumber ? `#${batter.playerNumber}` : '-'}</div>
            <div className="min-w-0">
              <div className="truncate font-bebas text-[20px] uppercase leading-none tracking-[0.03em] text-white">{batter.playerName}</div>
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#9CA3AF]">
                {[batter.position, batter.battingHand].filter(Boolean).join(' · ') || '—'}
              </div>
            </div>
            <div className="font-bebas text-[20px] leading-none text-white">{statValue(batter.avg)}</div>
            <div className="font-bebas text-[20px] leading-none text-white">{statValue(batter.hits)}</div>
            <div className="font-bebas text-[20px] leading-none text-white">{statValue(batter.rbi)}</div>
            <div className="font-bebas text-[20px] leading-none text-[#D4AF37]">{statValue(batter.today)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
