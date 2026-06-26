import { useState } from 'react';

import type { BatterState, NextBatterEntry, NextBattersOverlayProps } from './types';

function resolveAssetUrl(assetBaseUrl: string | undefined, assetId: string | undefined) {
  if (!assetBaseUrl || !assetId) return undefined;
  return `${assetBaseUrl.replace(/\/$/, '')}/${assetId}`;
}

const STATE_LABELS: Record<BatterState, string> = {
  current:    'AL BATE',
  on_deck:    'EN ESPERA',
  in_the_hole:'SIGUIENTE',
  third_next: 'LUEGO',
};

interface BatterColProps {
  batter: NextBatterEntry;
  photoUrl?: string;
  isLast?: boolean;
}

function BatterCol({ batter, photoUrl, isLast }: BatterColProps) {
  const [imgError, setImgError] = useState(false);
  const isCurrent = batter.state === 'current';

  return (
    <div className={`flex min-w-0 flex-1 flex-col ${isLast ? '' : 'border-r border-white/10'}`}>
      {/* State label row */}
      <div
        className={[
          'px-4 py-[5px] font-inter text-[10px] font-bold uppercase tracking-[0.18em]',
          isCurrent ? 'bg-mineros-red text-white' : 'bg-white/5 text-white/60',
        ].join(' ')}
      >
        {STATE_LABELS[batter.state]}
      </div>

      {/* Content row */}
      <div className={`flex items-center gap-3 px-4 py-3 ${isCurrent ? 'bg-mineros-navy' : 'bg-mineros-navy/60'}`}>
        {/* Photo rectangular */}
        <div className="h-[72px] w-[54px] shrink-0 overflow-hidden rounded-[4px] border border-mineros-gold/30 bg-broadcast-black/60">
          {photoUrl && !imgError ? (
            <img
              alt={batter.name}
              className="h-full w-full object-cover"
              src={photoUrl}
              onError={() => setImgError(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-bebas text-[22px] leading-none text-mineros-gold/60">
              {batter.number ?? '?'}
            </div>
          )}
        </div>

        {/* Name + stats */}
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            {batter.number && (
              <span className="font-bebas text-[26px] leading-none text-mineros-gold">#{batter.number}</span>
            )}
            <p className="min-w-0 truncate font-bebas text-[20px] uppercase leading-none tracking-[0.03em] text-white">
              {batter.name}
            </p>
          </div>

          {/* Posición + AVG + stats hoy */}
          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
            {batter.position && (
              <span className="rounded-[3px] bg-mineros-navy px-[6px] py-[2px] font-inter text-[10px] font-bold uppercase tracking-[0.1em] text-mineros-gold ring-1 ring-mineros-gold/40">
                {batter.position}
              </span>
            )}
            {batter.avg && (
              <span className="font-inter text-[11px] font-semibold text-white/65">
                AVG <span className="font-bold text-white">{batter.avg}</span>
              </span>
            )}
            {batter.today && (
              <span className="font-inter text-[11px] font-semibold text-mineros-gold/80">
                HOY <span className="font-bold text-mineros-gold">{batter.today}</span>
              </span>
            )}
            {batter.bats && (
              <span className="font-inter text-[10px] font-semibold uppercase text-white/45">
                {batter.bats}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TeamLogoProps {
  logoUrl?: string;
  shortName: string;
}

function TeamLogo({ logoUrl, shortName }: TeamLogoProps) {
  const [imgError, setImgError] = useState(false);

  if (logoUrl && !imgError) {
    return (
      <img
        alt={shortName}
        className="h-[52px] w-[52px] object-contain drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
        src={logoUrl}
        onError={() => setImgError(true)}
      />
    );
  }

  return (
    <span className="font-bebas text-[28px] uppercase leading-none tracking-[0.04em] text-white">
      {shortName}
    </span>
  );
}

export function NextBattersOverlay({ team, inning, batters, assetBaseUrl }: NextBattersOverlayProps) {
  const logoUrl = resolveAssetUrl(assetBaseUrl, team.logoAssetId);

  return (
    <section className="mb-shell relative h-[1080px] w-[1920px] overflow-hidden bg-transparent font-inter text-white">
      <div className="absolute bottom-[160px] left-[60px] flex w-[980px] overflow-hidden rounded-[6px] border-2 border-mineros-gold shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">

        {/* Left accent: logo + label */}
        <div className="flex w-[120px] shrink-0 flex-col items-center justify-center gap-2 bg-mineros-navy px-4 py-3">
          <TeamLogo logoUrl={logoUrl} shortName={team.shortName} />
          <p className="text-center font-inter text-[9px] font-bold uppercase tracking-[0.16em] text-mineros-gold/80">
            Próximos<br/>al bate
          </p>
        </div>

        {/* Inning badge */}
        <div className="flex w-[56px] shrink-0 flex-col items-center justify-center gap-1 border-l border-r border-white/10 bg-broadcast-black/60 px-2 py-3">
          <span className="font-inter text-[9px] font-bold uppercase tracking-[0.14em] text-white/50">ENT.</span>
          <span className="font-bebas text-[26px] leading-none text-white">{inning.number}</span>
          <span className="font-inter text-[9px] font-bold uppercase tracking-[0.1em] text-mineros-gold">
            {inning.half === 'top' ? 'ALTA' : 'BAJA'}
          </span>
        </div>

        {/* Player columns */}
        <div className="flex flex-1 divide-x divide-white/10">
          {batters.map((batter, idx) => (
            <BatterCol
              key={`${batter.playerId}-${batter.state}`}
              batter={batter}
              isLast={idx === batters.length - 1}
              photoUrl={resolveAssetUrl(assetBaseUrl, batter.photoAssetId)}
            />
          ))}
        </div>

        {/* Right closer: TOP 3 ORDEN */}
        <div className="flex w-[48px] shrink-0 flex-col items-center justify-center gap-0.5 border-l border-white/10 bg-broadcast-black/60 py-3">
          <span className="font-inter text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">TOP</span>
          <span className="font-bebas text-[28px] leading-none text-mineros-gold">3</span>
          <span className="font-inter text-[9px] font-bold uppercase tracking-[0.12em] text-white/50">ORDEN</span>
        </div>
      </div>
    </section>
  );
}
