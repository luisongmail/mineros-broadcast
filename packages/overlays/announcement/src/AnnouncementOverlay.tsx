import { BroadcastShell } from '@mineros/design-system';
import type { AnnouncementData, AnnouncementOverlayProps, AnnouncementVariant } from './types';

const VALID_VARIANTS: AnnouncementVariant[] = ['lower_third_compact', 'minimal', 'alert', 'clinic_card'];
function isVariant(v: string | undefined): v is AnnouncementVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as AnnouncementVariant);
}
function hasRequiredData(data: AnnouncementData | undefined) {
  return Boolean(data?.announcement?.type && data.announcement.title);
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

function LowerThirdCompact({ data }: { data: AnnouncementData }) {
  const { announcement: a } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Aviso</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[260px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">
            {a.title}
          </span>
          {a.subtitle && <span className="font-inter text-[13px] text-white/80">{a.subtitle}</span>}
          {a.detail && <span className="font-inter text-[12px] text-white/50">{a.detail}</span>}
        </div>
        {(a.place || a.date) && (
          <div className="flex min-w-[180px] flex-col gap-1 pl-6">
            {a.date && <span className="font-bebas text-[20px] leading-none text-white">{a.date}</span>}
            {a.place && <span className="font-inter text-[12px] text-white/70">{a.place}</span>}
          </div>
        )}
        {a.categories && (
          <div className="flex min-w-[140px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Para</span>
            <span className="font-inter text-[13px] text-white">{a.categories}</span>
          </div>
        )}
        {(a.action || a.socialHandle) && (
          <div className="flex min-w-[160px] flex-col gap-1 pl-6">
            {a.action && <span className="font-bebas text-[20px] leading-none text-mineros-gold">{a.action}</span>}
            {a.socialHandle && <span className="font-inter text-[13px] text-white/70">{a.socialHandle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AlertLayout({ data }: { data: AnnouncementData }) {
  const { announcement: a } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-red bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white">Alerta</span>
      </div>
      <div className="flex flex-1 items-center gap-4 px-6 py-4 text-white">
        <span className="font-bebas text-[24px] leading-none">{a.title}</span>
        {a.subtitle && <span className="font-inter text-[14px] text-white/70">{a.subtitle}</span>}
      </div>
    </div>
  );
}

function MinimalLayout({ data }: { data: AnnouncementData }) {
  const { announcement: a } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex items-center gap-4 rounded-md border border-mineros-gold bg-mineros-navy/95 px-5 py-3 shadow-broadcast">
      <span className="font-bebas text-[20px] leading-none text-mineros-gold">Aviso</span>
      <span className="font-inter text-[14px] text-white">{a.title}</span>
      {a.detail && <span className="font-inter text-[12px] text-white/60">{a.detail}</span>}
    </div>
  );
}

function ClinicCardLayout({ data }: { data: AnnouncementData }) {
  const { announcement: a } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center gap-2 bg-mineros-gold px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-navy">Clinica</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[260px] flex-col gap-1">
          <span className="font-bebas text-[24px] leading-none text-white">{a.title}</span>
          {a.subtitle && <span className="font-inter text-[13px] text-white/70">{a.subtitle}</span>}
        </div>
        {a.categories && (
          <div className="flex flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Categorias</span>
            <span className="font-inter text-[14px] text-white">{a.categories}</span>
          </div>
        )}
        {a.date && (
          <div className="flex flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Cuando</span>
            <span className="font-bebas text-[20px] leading-none text-white">{a.date}</span>
            {a.place && <span className="font-inter text-[12px] text-white/60">{a.place}</span>}
          </div>
        )}
        {a.action && (
          <div className="flex flex-col gap-1 pl-6">
            <span className="font-bebas text-[22px] leading-none text-mineros-gold">{a.action}</span>
            {a.socialHandle && <span className="font-inter text-[12px] text-white/70">{a.socialHandle}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

export function AnnouncementOverlay({ data, variant }: AnnouncementOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos del anuncio incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant === 'lower_third_compact' && <LowerThirdCompact data={data} />}
      {safeVariant === 'alert' && <AlertLayout data={data} />}
      {safeVariant === 'minimal' && <MinimalLayout data={data} />}
      {safeVariant === 'clinic_card' && <ClinicCardLayout data={data} />}
    </BroadcastShell>
  );
}
