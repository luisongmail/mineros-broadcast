import { BroadcastShell } from '@playflow/design-system';
import type { GameEventData, GameEventOverlayProps, GameEventVariant } from './types';

const VALID_VARIANTS: GameEventVariant[] = ['lower_third_compact', 'minimal'];
function isVariant(v: string | undefined): v is GameEventVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as GameEventVariant);
}
function hasRequiredData(data: GameEventData | undefined) {
  return Boolean(data?.gameId && data.event?.type && data.event?.label && data.player?.name);
}

const EVENT_COLORS: Partial<Record<string, string>> = {
  home_run: 'text-mineros-gold',
  triple: 'text-mineros-gold',
  double: 'text-white',
  hit: 'text-white',
  strikeout: 'text-mineros-red',
  error: 'text-mineros-red',
};

function OverlayError({ message }: { message: string }) {
  return (
    <BroadcastShell>
      <div className="absolute bottom-[160px] left-[60px] rounded-md border-2 border-mineros-red bg-broadcast-black/90 px-6 py-4 font-inter text-lg font-semibold text-white shadow-broadcast">
        {message}
      </div>
    </BroadcastShell>
  );
}

function LowerThirdCompact({ data }: { data: GameEventData }) {
  const { event, player, scoreImpact, bases } = data;
  const eventColor = EVENT_COLORS[event.type] ?? 'text-white';
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Jugada</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[180px] flex-col gap-1">
          <span className={`font-bebas text-[30px] leading-none ${eventColor}`}>{event.label}</span>
          {event.direction && <span className="font-inter text-[12px] text-white/60">{event.direction}</span>}
        </div>
        <div className="flex min-w-[220px] flex-col gap-1 pl-6">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Bateadora</span>
          <div className="flex items-baseline gap-2">
            {player.number && (
              <span className="font-bebas text-[20px] leading-none text-mineros-gold">#{player.number}</span>
            )}
            <span className="font-bebas text-[22px] leading-none text-white">{player.name}</span>
          </div>
          {player.stat && <span className="font-inter text-[12px] text-white/60">{player.stat}</span>}
        </div>
        {scoreImpact && (
          <div className="flex min-w-[140px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Marcador</span>
            <span className="font-bebas text-[22px] leading-none text-mineros-gold">
              {scoreImpact.team} +{scoreImpact.change}
            </span>
            {scoreImpact.label && <span className="font-inter text-[12px] text-white/60">{scoreImpact.label}</span>}
          </div>
        )}
        {bases?.label && (
          <div className="flex min-w-[120px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Bases</span>
            <span className="font-inter text-[13px] text-white">{bases.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalLayout({ data }: { data: GameEventData }) {
  const { event, player } = data;
  const eventColor = EVENT_COLORS[event.type] ?? 'text-white';
  return (
    <div className="absolute bottom-[160px] left-[60px] flex items-center gap-4 rounded-md border border-mineros-gold bg-mineros-navy/95 px-5 py-3 shadow-broadcast">
      <span className={`font-bebas text-[24px] leading-none ${eventColor}`}>{event.label}</span>
      <span className="font-bebas text-[18px] text-white">{player.name}</span>
      {player.stat && <span className="font-inter text-[12px] text-white/50">{player.stat}</span>}
    </div>
  );
}

export function GameEventOverlay({ data, variant }: GameEventOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos del evento incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant === 'lower_third_compact' && <LowerThirdCompact data={data} />}
      {safeVariant === 'minimal' && <MinimalLayout data={data} />}
    </BroadcastShell>
  );
}
