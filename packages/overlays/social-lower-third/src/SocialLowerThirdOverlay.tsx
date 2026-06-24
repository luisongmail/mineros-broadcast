import { BroadcastShell } from '@mineros/design-system';
import type { SocialLowerThirdData, SocialLowerThirdOverlayProps, SocialLowerThirdVariant } from './types';

const VALID_VARIANTS: SocialLowerThirdVariant[] = ['lower_third_compact', 'minimal_handle', 'dual_channel'];
function isVariant(v: string | undefined): v is SocialLowerThirdVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as SocialLowerThirdVariant);
}
function hasRequiredData(data: SocialLowerThirdData | undefined) {
  return Boolean(data?.social?.primaryHandle && data.message?.title);
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

function LowerThirdCompact({ data }: { data: SocialLowerThirdData }) {
  const { social, message } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[860px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Redes</span>
      </div>
      <div className="flex flex-1 items-center gap-6 divide-x divide-white/10 px-6 py-4 text-white">
        <div className="flex min-w-[200px] flex-col gap-1">
          <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">{message.title}</span>
          <span className="font-bebas text-[24px] leading-none text-white">{social.primaryHandle}</span>
          {message.subtitle && <span className="font-inter text-[12px] text-white/60">{message.subtitle}</span>}
        </div>
        {social.instagram && (
          <div className="flex min-w-[160px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Instagram</span>
            <span className="font-bebas text-[18px] leading-none text-white">{social.instagram.handle}</span>
            {social.instagram.label && <span className="font-inter text-[11px] text-white/50">{social.instagram.label}</span>}
          </div>
        )}
        {social.youtube && (
          <div className="flex min-w-[160px] flex-col gap-1 pl-6">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">YouTube</span>
            <span className="font-bebas text-[18px] leading-none text-white">{social.youtube.handle}</span>
            {social.youtube.label && <span className="font-inter text-[11px] text-white/50">{social.youtube.label}</span>}
          </div>
        )}
        {message.cta && (
          <div className="flex min-w-[120px] flex-col gap-1 pl-6">
            <span className="font-bebas text-[20px] leading-none text-mineros-gold">{message.cta}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalHandleLayout({ data }: { data: SocialLowerThirdData }) {
  const { social, message } = data;
  return (
    <div className="absolute bottom-[60px] right-[60px] flex items-center gap-3 rounded-md border border-mineros-gold bg-mineros-navy/90 px-5 py-3 shadow-broadcast">
      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">{message.title}</span>
      <span className="font-bebas text-[22px] leading-none text-white">{social.primaryHandle}</span>
    </div>
  );
}

function DualChannelLayout({ data }: { data: SocialLowerThirdData }) {
  const { social } = data;
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[700px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">Redes</span>
      </div>
      <div className="flex flex-1 items-center divide-x divide-white/10 px-6 py-4 text-white">
        {social.instagram && (
          <div className="flex flex-1 flex-col items-center gap-1 pr-4">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-mineros-gold">Instagram</span>
            <span className="font-bebas text-[22px] leading-none text-white">{social.instagram.handle}</span>
          </div>
        )}
        {social.youtube && (
          <div className="flex flex-1 flex-col items-center gap-1 pl-4">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.14em] text-mineros-gold">YouTube</span>
            <span className="font-bebas text-[22px] leading-none text-white">{social.youtube.handle}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function SocialLowerThirdOverlay({ data, variant }: SocialLowerThirdOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos de redes incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant === 'lower_third_compact' && <LowerThirdCompact data={data} />}
      {safeVariant === 'minimal_handle' && <MinimalHandleLayout data={data} />}
      {safeVariant === 'dual_channel' && <DualChannelLayout data={data} />}
    </BroadcastShell>
  );
}
