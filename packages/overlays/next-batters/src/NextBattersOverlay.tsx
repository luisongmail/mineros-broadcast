import { BatterCard } from './components/BatterCard';
import type { NextBattersOverlayProps, NextBatersVariant } from './types';

function resolveAssetUrl(assetBaseUrl: string | undefined, assetId: string | undefined) {
  if (!assetBaseUrl || !assetId) {
    return undefined;
  }

  return `${assetBaseUrl.replace(/\/$/, '')}/${assetId}`;
}

const variantLayoutClasses: Record<NextBatersVariant, string> = {
  horizontal_compact: 'flex-row',
  vertical_side: 'w-[320px] flex-col',
  lower_third: 'flex-row max-w-[1180px]',
};

export function NextBattersOverlay({ team, inning, batters, variant = 'horizontal_compact', assetBaseUrl }: NextBattersOverlayProps) {
  const inningLabel = `${inning.half === 'top' ? 'ALTA' : 'BAJA'} ${inning.number}`;

  return (
    <section className="mb-shell relative h-[1080px] w-[1920px] overflow-hidden bg-transparent font-inter text-white">
      <div className="absolute bottom-[160px] left-[60px] w-[980px] rounded-[8px] border border-mineros-gold bg-mineros-navy/92 p-4 shadow-[0px_12px_32px_rgba(0,0,0,0.34)]">
        <div className="mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3">
          <div>
            <p className="font-bebas text-[18px] uppercase tracking-[0.18em] text-mineros-gold">Proximos bateadores</p>
            <h2 className="font-bebas text-[28px] uppercase leading-none tracking-[0.06em] text-white">{team.name}</h2>
          </div>
          <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Entrada</p>
            <p className="font-bebas text-[22px] leading-none text-white">{inningLabel}</p>
          </div>
        </div>

        <div className={`flex gap-3 ${variantLayoutClasses[variant]}`}>
          {batters.map((batter) => (
            <BatterCard
              key={`${batter.playerId}-${batter.state}`}
              batter={batter}
              photoUrl={resolveAssetUrl(assetBaseUrl, batter.photoAssetId)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
