import { resolveAssetUrl } from './TeamBadge';
import type { ScoreboardOverlayData } from '../types';

function formatDate(value: string | undefined) {
  if (!value) return '-- --- ----';

  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed
    .toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
    .replace('.', '')
    .toUpperCase();
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-[116px] rounded-[6px] border border-white/8 bg-black/20 px-4 py-3">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9CA3AF]">{label}</div>
      <div className="mt-1 font-bebas text-[28px] leading-none tracking-[0.04em] text-white">{value}</div>
    </div>
  );
}

export function Zone1Header({ data, assetBaseUrl }: { data: ScoreboardOverlayData; assetBaseUrl?: string }) {
  const brandSrc = resolveAssetUrl(assetBaseUrl, data.branding.brandLogoAssetId);
  const competitionLine = [data.competition.name, data.competition.tournament, data.competition.category]
    .filter(Boolean)
    .join(' · ');
  const venueLine = [data.venue?.name, data.game.gameType].filter(Boolean).join(' · ');

  return (
    <section className="grid grid-cols-[1.45fr_0.95fr] gap-6 rounded-[6px] border border-white/8 bg-[#111111] px-8 py-6 shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
      <div className="flex min-w-0 items-center gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#1B2F5B] text-[#D4AF37] shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
          {brandSrc ? (
            <img alt={data.branding.brandName} className="h-14 w-14 object-contain" src={brandSrc} />
          ) : (
            <span className="font-bebas text-[30px] tracking-[0.08em]">MIN</span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-inter text-[12px] font-bold uppercase tracking-[0.26em] text-[#D4AF37]">
            {data.branding.brandName || 'MINEROS BROADCAST'}
          </div>
          <div className="mt-1 truncate font-bebas text-[34px] uppercase leading-none tracking-[0.03em] text-white">
            {competitionLine || 'LIGA · TORNEO · CATEGORÍA'}
          </div>
          <div className="mt-2 truncate text-[14px] text-[#9CA3AF]">{venueLine || 'Sede por confirmar'}</div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        <InfoBlock label="Fecha" value={formatDate(data.game.date)} />
        <InfoBlock label="Inicio" value={data.game.startTime ?? '--:--'} />
        <InfoBlock label="Entradas" value={String(data.game.configuredInnings ?? 7)} />
        <InfoBlock label="Restante" value={data.game.remainingTime ?? '--:--'} />
      </div>
    </section>
  );
}
