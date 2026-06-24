import { BroadcastShell } from '@mineros/design-system';
import type { FinalScoreData, FinalScoreOverlayProps, FinalScoreVariant } from './types';

const VALID_VARIANTS: FinalScoreVariant[] = [
  'lower_third_compact', 'full_width', 'full_card', 'minimal', 'sponsor_closing',
];

function isVariant(v: string | undefined): v is FinalScoreVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as FinalScoreVariant);
}

function hasRequiredData(data: FinalScoreData | undefined): boolean {
  return Boolean(
    data?.gameId && data.status && data.winner?.teamId &&
    data.finalScore && typeof data.finalScore.winnerRuns === 'number' &&
    typeof data.finalScore.loserRuns === 'number',
  );
}

function OverlayError({ message }: { message: string }) {
  return (
    <BroadcastShell>
      <div className="absolute bottom-[160px] left-[60px] rounded-md border-2 border-mineros-red bg-broadcast-black/90 px-6 py-4 font-inter text-lg font-semibold text-white shadow-broadcast">
        {message}
      </div>
    </BroadcastShell>
  );
}

function LowerThirdCompact({ data }: { data: FinalScoreData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Final</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Ganador</span>
          <span className="font-bebas text-[30px] leading-none text-white">
            {data.winner.shortName} {data.finalScore.winnerRuns}
          </span>
          {data.context?.label && (
            <span className="font-inter text-[12px] text-white/60">{data.context.label}</span>
          )}
        </div>
        <div className="flex min-w-[180px] flex-col gap-1 pl-6">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Rival</span>
          <span className="font-bebas text-[26px] leading-none text-white/80">
            {data.loser.shortName} {data.finalScore.loserRuns}
          </span>
        </div>
        {data.lineScore && (
          <div className="flex flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">R H E</span>
            <div className="flex gap-4">
              <div className="flex flex-col">
                <span className="font-inter text-[11px] text-white/50">{data.winner.shortName}</span>
                <span className="font-bebas text-[18px] leading-none text-white">
                  {data.lineScore.winner.runs} {data.lineScore.winner.hits} {data.lineScore.winner.errors}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-inter text-[11px] text-white/50">{data.loser.shortName}</span>
                <span className="font-bebas text-[18px] leading-none text-white/70">
                  {data.lineScore.loser.runs} {data.lineScore.loser.hits} {data.lineScore.loser.errors}
                </span>
              </div>
            </div>
          </div>
        )}
        {data.featuredPlayer && (
          <div className="flex flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Destacada</span>
            <span className="font-bebas text-[20px] leading-none text-white">{data.featuredPlayer.name}</span>
            <span className="font-inter text-[12px] text-white/70">{data.featuredPlayer.summary}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function FullCardLayout({ data }: { data: FinalScoreData }) {
  return (
    <div className="absolute left-1/2 top-1/2 flex h-[480px] w-[1080px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-8 rounded-[8px] border-2 border-mineros-gold bg-mineros-navy/95 px-12 py-10 text-white shadow-[0px_18px_40px_rgba(0,0,0,0.42)]">
      <span className="font-inter text-[14px] font-bold uppercase tracking-[0.22em] text-mineros-gold">Resultado Final</span>
      <div className="flex items-center gap-10">
        <div className="flex flex-col items-center gap-2">
          <span className="font-bebas text-[60px] leading-none">{data.winner.shortName}</span>
          <span className="font-bebas text-[80px] leading-none text-mineros-gold">{data.finalScore.winnerRuns}</span>
        </div>
        <span className="font-bebas text-[48px] text-white/30">-</span>
        <div className="flex flex-col items-center gap-2">
          <span className="font-bebas text-[60px] leading-none">{data.loser.shortName}</span>
          <span className="font-bebas text-[80px] leading-none text-white/60">{data.finalScore.loserRuns}</span>
        </div>
      </div>
      {data.context?.label && <span className="font-inter text-[16px] text-white/50">{data.context.label}</span>}
    </div>
  );
}

export function FinalScoreOverlay({ data, variant }: FinalScoreOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos del resultado final incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant !== 'full_card' && <LowerThirdCompact data={data} />}
      {safeVariant === 'full_card' && <FullCardLayout data={data} />}
    </BroadcastShell>
  );
}
