import { useEffect, useState } from 'react';
import { BroadcastShell } from '@playflow/design-system';
import type { CountdownData, CountdownOverlayProps, CountdownVariant } from './types';

const VALID_VARIANTS: CountdownVariant[] = ['lower_third_compact', 'minimal_timer'];
function isVariant(v: string | undefined): v is CountdownVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as CountdownVariant);
}
function hasRequiredData(data: CountdownData | undefined) {
  return Boolean(data?.countdown?.targetTime && data.countdown.type);
}

function useCountdown(targetTime: string) {
  const calc = () => {
    const diff = Math.max(0, new Date(targetTime).getTime() - Date.now());
    const h = Math.floor(diff / 3_600_000);
    const m = Math.floor((diff % 3_600_000) / 60_000);
    const s = Math.floor((diff % 60_000) / 1_000);
    return { h, m, s, done: diff === 0 };
  };
  const [time, setTime] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setTime(calc()), 1000);
    return () => clearInterval(id);
  }, [targetTime]);
  return time;
}

function pad(n: number) { return String(n).padStart(2, '0'); }

function TimerDisplay({ targetTime, large = false }: { targetTime: string; large?: boolean }) {
  const { h, m, s } = useCountdown(targetTime);
  const cls = large ? 'font-bebas text-[52px] leading-none text-white' : 'font-bebas text-[32px] leading-none text-white';
  return <span className={cls}>{pad(h)}:{pad(m)}:{pad(s)}</span>;
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

function LowerThirdCompact({ data }: { data: CountdownData }) {
  const { countdown, event } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
          {countdown.label ?? 'Cuenta'}
        </span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[160px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Tiempo</span>
          <TimerDisplay targetTime={countdown.targetTime} />
        </div>
        {event?.title && (
          <div className="flex min-w-[240px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Proximo</span>
            <span className="font-bebas text-[22px] leading-none text-white">{event.title}</span>
            {event.subtitle && <span className="font-inter text-[12px] text-white/60">{event.subtitle}</span>}
          </div>
        )}
        {event?.venue && (
          <div className="flex min-w-[160px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Sede</span>
            <span className="font-inter text-[13px] text-white">{event.venue}</span>
          </div>
        )}
        {event?.status && (
          <div className="flex min-w-[100px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Estado</span>
            <span className="font-inter text-[13px] font-semibold text-white">{event.status}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalTimerLayout({ data }: { data: CountdownData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex items-center gap-4 rounded-md border-2 border-mineros-gold bg-mineros-navy px-6 py-4 shadow-broadcast">
      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">
        {data.countdown.label ?? 'En'}
      </span>
      <TimerDisplay targetTime={data.countdown.targetTime} large />
    </div>
  );
}

export function CountdownOverlay({ data, variant }: CountdownOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos del countdown incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant === 'lower_third_compact' && <LowerThirdCompact data={data} />}
      {safeVariant === 'minimal_timer' && <MinimalTimerLayout data={data} />}
    </BroadcastShell>
  );
}
