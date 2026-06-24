import { BroadcastShell } from '@mineros/design-system';
import type { SponsorBreakData, SponsorBreakOverlayProps, SponsorBreakVariant } from './types';

const VALID_VARIANTS: SponsorBreakVariant[] = [
  'lower_third_compact', 'full_width', 'logo_only', 'sponsor_cta', 'multi_sponsor',
];

function isVariant(v: string | undefined): v is SponsorBreakVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as SponsorBreakVariant);
}

function hasRequiredData(data: SponsorBreakData | undefined): boolean {
  return Boolean(data?.sponsor?.sponsorId && data.sponsor.name && data.placement?.type);
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

function LowerThirdCompact({ data }: { data: SponsorBreakData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[860px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Pausa</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[200px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Presenta</span>
          <span className="font-bebas text-[26px] leading-none text-white">{data.sponsor.name}</span>
          {data.context?.label && (
            <span className="font-inter text-[12px] text-white/60">{data.context.label}</span>
          )}
        </div>
        {data.message?.title && (
          <div className="flex min-w-[200px] flex-col gap-1 pl-6">
            <span className="font-bebas text-[22px] leading-none text-white">{data.message.title}</span>
            {data.message.subtitle && (
              <span className="font-inter text-[13px] text-white/70">{data.message.subtitle}</span>
            )}
          </div>
        )}
        {(data.cta?.text ?? data.cta?.handle) && (
          <div className="flex min-w-[180px] flex-col gap-1 pl-6">
            {data.cta?.text && (
              <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">
                {data.cta.text}
              </span>
            )}
            {data.cta?.handle && (
              <span className="font-bebas text-[20px] leading-none text-white">{data.cta.handle}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function LogoOnlyLayout({ data }: { data: SponsorBreakData }) {
  return (
    <div className="absolute bottom-[60px] right-[60px] flex items-center gap-3 rounded-md border border-mineros-gold bg-mineros-navy/90 px-5 py-3 shadow-broadcast">
      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Presenta</span>
      <span className="font-bebas text-[22px] leading-none text-white">{data.sponsor.name}</span>
    </div>
  );
}

export function SponsorBreakOverlay({ data, variant }: SponsorBreakOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos del sponsor incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant !== 'logo_only' && <LowerThirdCompact data={data} />}
      {safeVariant === 'logo_only' && <LogoOnlyLayout data={data} />}
    </BroadcastShell>
  );
}
