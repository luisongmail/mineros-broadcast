import { TeamBadge } from './TeamBadge';
import type { InningValue, ScoreboardOverlayData, ScoreboardTeam } from '../types';

function valueLabel(value: InningValue) {
  if (value === null || value === undefined) return '-';
  return String(value);
}

function TeamCell({
  team,
  role,
  assetBaseUrl,
}: {
  team: ScoreboardTeam;
  role: 'VISITANTE' | 'LOCAL';
  assetBaseUrl?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-4">
      <TeamBadge abbr={team.abbr} assetBaseUrl={assetBaseUrl} logoAssetId={team.logoAssetId} size="md" />
      <div className="min-w-0">
        <div className="flex items-baseline gap-3">
          <span className="font-bebas text-[28px] leading-none tracking-[0.04em] text-white">{team.abbr}</span>
          <span className="truncate font-bebas text-[24px] uppercase leading-none tracking-[0.03em] text-white">{team.displayName}</span>
        </div>
        <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9CA3AF]">{role}</div>
      </div>
    </div>
  );
}

function StatCell({ value, emphasis = false }: { value: string; emphasis?: boolean }) {
  return (
    <div className={`flex items-center justify-center border-l border-white/8 px-2 py-4 text-center ${emphasis ? 'font-bebas text-[34px] text-[#D4AF37]' : 'font-bebas text-[28px] text-white'}`}>
      {value}
    </div>
  );
}

export function Zone2LineScore({ data, assetBaseUrl }: { data: ScoreboardOverlayData; assetBaseUrl?: string }) {
  const configuredInnings = Math.max(1, data.game.configuredInnings ?? data.lineScore.innings.length ?? 7);
  const innings = Array.from({ length: configuredInnings }, (_, index) => {
    const inningNumber = index + 1;
    return data.lineScore.innings.find((item) => item.inning === inningNumber) ?? { inning: inningNumber, away: null, home: null };
  });
  const gridTemplateColumns = `minmax(360px, 1.9fr) repeat(${configuredInnings}, minmax(58px, 0.45fr)) minmax(78px, 0.55fr) minmax(66px, 0.45fr) minmax(66px, 0.45fr)`;

  return (
    <section className="rounded-[6px] border border-white/8 bg-[#111111] px-8 py-6 shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <h2 className="font-bebas text-[32px] uppercase leading-none tracking-[0.05em] text-white">Pizarra oficial</h2>
          <p className="mt-1 text-[13px] text-[#9CA3AF]">Line score por entrada y totales oficiales del juego.</p>
        </div>
        <div className="text-right text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9CA3AF]">
          {data.game.status ?? 'live'}
        </div>
      </div>

      <div className="overflow-hidden rounded-[6px] border border-[#D4AF37]/30 bg-black/25">
        <div className="grid border-b border-[#D4AF37]/25 bg-white/5" style={{ gridTemplateColumns }}>
          <div className="px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9CA3AF]">Equipo</div>
          {innings.map((inning) => (
            <div key={`inning-header-${inning.inning}`} className="flex items-center justify-center border-l border-white/8 px-2 py-3 font-bebas text-[24px] leading-none text-white">
              {inning.inning}
            </div>
          ))}
          <div className="flex items-center justify-center border-l border-[#D4AF37]/35 px-2 py-3 font-bebas text-[24px] leading-none text-[#D4AF37]">R</div>
          <div className="flex items-center justify-center border-l border-[#D4AF37]/25 px-2 py-3 font-bebas text-[24px] leading-none text-[#D4AF37]">H</div>
          <div className="flex items-center justify-center border-l border-[#D4AF37]/25 px-2 py-3 font-bebas text-[24px] leading-none text-[#D4AF37]">E</div>
        </div>

        <div className="grid border-b border-white/8" style={{ gridTemplateColumns }}>
          <TeamCell assetBaseUrl={assetBaseUrl} role="VISITANTE" team={data.teams.away} />
          {innings.map((inning) => (
            <StatCell key={`away-${inning.inning}`} value={valueLabel(inning.away)} />
          ))}
          <StatCell emphasis value={String(data.lineScore.totals.away.runs)} />
          <StatCell value={String(data.lineScore.totals.away.hits ?? '-')} />
          <StatCell value={String(data.lineScore.totals.away.errors ?? '-')} />
        </div>

        <div className="grid" style={{ gridTemplateColumns }}>
          <TeamCell assetBaseUrl={assetBaseUrl} role="LOCAL" team={data.teams.home} />
          {innings.map((inning) => (
            <StatCell key={`home-${inning.inning}`} value={valueLabel(inning.home)} />
          ))}
          <StatCell emphasis value={String(data.lineScore.totals.home.runs)} />
          <StatCell value={String(data.lineScore.totals.home.hits ?? '-')} />
          <StatCell value={String(data.lineScore.totals.home.errors ?? '-')} />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-4 text-[12px] font-semibold uppercase tracking-[0.16em] text-[#D4AF37]">
        <span>R = Carreras &nbsp; H = Hits &nbsp; E = Errores</span>
        <span>Configuración del juego: {data.game.configuredInnings ?? 7} entradas</span>
      </div>
    </section>
  );
}
