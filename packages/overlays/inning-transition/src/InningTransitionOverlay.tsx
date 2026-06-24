import { BroadcastShell } from '@mineros/design-system';
import type { InningTransitionData, InningTransitionOverlayProps, InningTransitionVariant } from './types';

const VALID_VARIANTS: InningTransitionVariant[] = [
  'lower_third_compact', 'full_width', 'minimal', 'scorebug_attached', 'end_game',
];

function isVariant(v: string | undefined): v is InningTransitionVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as InningTransitionVariant);
}

function hasRequiredData(data: InningTransitionData | undefined): boolean {
  return Boolean(
    data?.gameId && data.transition?.type && data.inning?.number &&
    data.inning?.nextHalf && data.score && data.nextBattingTeam?.teamId,
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

function LowerThirdCompact({ data }: { data: InningTransitionData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Inning</span>
        <span className="font-bebas text-[32px] leading-none text-white">{data.inning.number}</span>
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.12em] text-white/80">
          {data.inning.completedHalf === 'top' ? 'Alta' : 'Baja'}
        </span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[220px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Estado</span>
          <span className="font-bebas text-[22px] leading-none text-white">{data.transition.statusLabel}</span>
          <span className="font-inter text-[13px] font-semibold text-white/70">{data.transition.nextLabel}</span>
        </div>
        <div className="flex min-w-[180px] flex-col gap-1 pl-6">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Marcador</span>
          <div className="flex items-baseline gap-2">
            <span className="font-bebas text-[26px] leading-none text-white">
              {data.score.home.shortName} {data.score.home.runs}
            </span>
            <span className="text-white/40">-</span>
            <span className="font-bebas text-[26px] leading-none text-white">
              {data.score.away.shortName} {data.score.away.runs}
            </span>
          </div>
        </div>
        <div className="flex min-w-[200px] flex-col gap-1 pl-6">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Prxxximo turno</span>
          <span className="font-bebas text-[22px] leading-none text-white">{data.nextBattingTeam.shortName}</span>
          {data.nextBattersSummary && (
            <span className="font-inter text-[13px] text-white/70">{data.nextBattersSummary}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function MinimalLayout({ data }: { data: InningTransitionData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex items-center gap-4 rounded-md border border-mineros-gold bg-mineros-navy/95 px-5 py-3 shadow-broadcast">
      <span className="font-bebas text-[22px] leading-none text-mineros-gold">{data.inning.number}</span>
      <span className="font-bebas text-[18px] text-white">{data.transition.label}</span>
      <span className="font-bebas text-[20px] text-white">
        {data.score.home.shortName} {data.score.home.runs} - {data.score.away.shortName} {data.score.away.runs}
      </span>
    </div>
  );
}

export function InningTransitionOverlay({ data, variant }: InningTransitionOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos de transicinnn incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant !== 'minimal' && <LowerThirdCompact data={data} />}
      {safeVariant === 'minimal' && <MinimalLayout data={data} />}
    </BroadcastShell>
  );
}
