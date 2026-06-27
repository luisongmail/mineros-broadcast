import { BroadcastShell } from '@playflow/design-system';
import type { SubstitutionData, SubstitutionOverlayProps, SubstitutionVariant } from './types';

const VALID_VARIANTS: SubstitutionVariant[] = ['lower_third_compact', 'minimal'];
function isVariant(v: string | undefined): v is SubstitutionVariant {
  return v !== undefined && VALID_VARIANTS.includes(v as SubstitutionVariant);
}
function hasRequiredData(data: SubstitutionData | undefined) {
  return Boolean(data?.gameId && data.substitution?.type && data.playerOut?.name && data.playerIn?.name);
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

function PlayerCard({ player, role }: { player: SubstitutionData['playerOut']; role: 'SALE' | 'ENTRA' }) {
  const isIn = role === 'ENTRA';
  return (
    <div className="flex min-w-[260px] flex-col gap-1">
      <span className={`font-inter text-[11px] font-bold uppercase tracking-[0.18em] ${isIn ? 'text-mineros-gold' : 'text-white/50'}`}>
        {role}
      </span>
      <div className="flex items-baseline gap-2">
        {player.number && (
          <span className="font-bebas text-[28px] leading-none text-mineros-gold">#{player.number}</span>
        )}
        <span className="font-bebas text-[24px] leading-none text-white">{player.name}</span>
      </div>
      {player.position && (
        <span className="font-inter text-[12px] text-white/60">{player.position}</span>
      )}
      {player.detail && (
        <span className="font-inter text-[11px] text-white/40">{player.detail}</span>
      )}
    </div>
  );
}

function LowerThirdCompact({ data }: { data: SubstitutionData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex w-[980px] items-stretch overflow-hidden rounded-md border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.35)]">
      <div className="flex items-center bg-mineros-red px-5 py-4">
        <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-white/80">
          Cambio
        </span>
      </div>
      <div className="flex flex-1 items-center gap-4 divide-x divide-white/10 px-6 py-4 text-white">
        <PlayerCard player={data.playerOut} role="SALE" />
        <div className="flex flex-col items-center gap-1 px-4">
          <span className="font-bebas text-[22px] leading-none text-mineros-gold">➜</span>
          <span className="font-inter text-[10px] uppercase tracking-[0.14em] text-white/40">
            {data.substitution.label}
          </span>
        </div>
        <PlayerCard player={data.playerIn} role="ENTRA" />
        {data.substitution.reason && (
          <div className="flex min-w-[100px] flex-col gap-1 pl-4">
            <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Motivo</span>
            <span className="font-inter text-[13px] text-white">{data.substitution.reason}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function MinimalLayout({ data }: { data: SubstitutionData }) {
  return (
    <div className="absolute bottom-[160px] left-[60px] flex items-center gap-4 rounded-md border border-mineros-gold bg-mineros-navy/95 px-5 py-3 shadow-broadcast">
      <span className="font-inter text-[11px] font-bold uppercase tracking-[0.18em] text-mineros-gold">Cambio</span>
      <span className="font-bebas text-[18px] text-white/60">{data.playerOut.name}</span>
      <span className="font-bebas text-[18px] leading-none text-mineros-gold">➜</span>
      <span className="font-bebas text-[18px] text-white">{data.playerIn.name}</span>
      {data.playerIn.position && (
        <span className="font-inter text-[12px] text-white/50">{data.playerIn.position}</span>
      )}
    </div>
  );
}

export function SubstitutionOverlay({ data, variant }: SubstitutionOverlayProps) {
  if (!hasRequiredData(data)) return <OverlayError message="Datos de sustitucion incompletos" />;
  const safeVariant = isVariant(variant) ? variant : 'lower_third_compact';
  return (
    <BroadcastShell>
      {safeVariant === 'lower_third_compact' && <LowerThirdCompact data={data} />}
      {safeVariant === 'minimal' && <MinimalLayout data={data} />}
    </BroadcastShell>
  );
}
