import { BroadcastShell } from '@mineros/design-system';

import { PlayerName } from './components/PlayerName';
import { PlayerNumber } from './components/PlayerNumber';
import { PlayerPhoto } from './components/PlayerPhoto';
import { PlayerStatus } from './components/PlayerStatus';
import { PositionBadge } from './components/PositionBadge';
import { StatsGrid } from './components/StatsGrid';
import type { BatterData, BatterOverlayProps, BatterVariant } from './types';

const validVariants: BatterVariant[] = ['lower_third', 'compact', 'scorebug_expanded', 'fullscreen_card'];

function isVariant(value: string | undefined): value is BatterVariant {
  return value !== undefined && validVariants.includes(value as BatterVariant);
}

function hasRequiredData(batter: BatterData | undefined) {
  return Boolean(batter?.playerId && batter.name && batter.status && batter.teamId);
}

function OverlayError({ message }: { message: string }) {
  return (
    <BroadcastShell>
      <div className="absolute bottom-[80px] left-[60px] rounded-[6px] border-2 border-mineros-red bg-broadcast-black/90 px-6 py-4 font-inter text-lg font-semibold text-white shadow-broadcast">
        {message}
      </div>
    </BroadcastShell>
  );
}

function BatterIdentity({ batter }: { batter: BatterData }) {
  return (
    <div className="flex items-start gap-4">
      <PlayerNumber number={batter.number} />
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <PlayerName className="truncate" name={batter.name} />
        <PositionBadge position={batter.position} />
      </div>
    </div>
  );
}

function LowerThirdLayout({ batter, assetBaseUrl, className }: { batter: BatterData; assetBaseUrl?: string; className?: string }) {
  return (
    <div
      className={[
        'absolute bottom-[160px] left-[60px] flex w-[700px] items-start gap-5 rounded-md border-2 border-mineros-gold bg-mineros-navy px-5 py-5 text-white shadow-[0px_10px_28px_rgba(0,0,0,0.35)]',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <PlayerPhoto assetBaseUrl={assetBaseUrl} name={batter.name} photoAssetId={batter.photoAssetId} />
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <BatterIdentity batter={batter} />
        <PlayerStatus status={batter.status} />
        <StatsGrid stats={batter.stats} />
      </div>
    </div>
  );
}

function CompactLayout({ batter }: { batter: BatterData }) {
  return (
    <div className="absolute bottom-[60px] left-[60px] flex min-h-[72px] min-w-[420px] items-center gap-3 rounded-[6px] border border-mineros-gold bg-mineros-navy/95 px-5 py-3 font-inter text-white shadow-broadcast">
      <PlayerNumber className="text-[34px]" number={batter.number} />
      <span className="font-bebas text-[34px] uppercase leading-none tracking-[0.03em]">{batter.name}</span>
      <PositionBadge className="text-xs" position={batter.position} />
      <span className="text-white/40">•</span>
      <span className="text-sm font-bold uppercase tracking-[0.14em] text-mineros-gold">{batter.status}</span>
    </div>
  );
}

function FullscreenCardLayout({ batter, assetBaseUrl }: { batter: BatterData; assetBaseUrl?: string }) {
  return (
    <div className="absolute left-1/2 top-1/2 flex h-[620px] w-[1080px] -translate-x-1/2 -translate-y-1/2 items-center gap-10 rounded-[8px] border-2 border-mineros-gold bg-mineros-navy/95 px-12 py-10 text-white shadow-[0px_18px_40px_rgba(0,0,0,0.42)]">
      <PlayerPhoto assetBaseUrl={assetBaseUrl} className="h-[420px] w-[320px]" name={batter.name} photoAssetId={batter.photoAssetId} />
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <span className="font-inter text-sm font-bold uppercase tracking-[0.22em] text-mineros-gold">Presentación de bateadora</span>
        <BatterIdentity batter={batter} />
        <PlayerStatus className="text-base" status={batter.status} />
        <StatsGrid className="gap-x-6 text-lg" stats={batter.stats} />
      </div>
    </div>
  );
}

export function BatterOverlay({ batter, variant, assetBaseUrl }: BatterOverlayProps) {
  if (!hasRequiredData(batter)) {
    return <OverlayError message="Datos de bateador incompletos" />;
  }

  const safeVariant = isVariant(variant) ? variant : 'lower_third';

  return (
    <BroadcastShell>
      {safeVariant === 'compact' && <CompactLayout batter={batter} />}
      {safeVariant === 'scorebug_expanded' && <LowerThirdLayout assetBaseUrl={assetBaseUrl} batter={batter} className="bottom-[0px] rounded-t-md rounded-b-none" />}
      {safeVariant === 'fullscreen_card' && <FullscreenCardLayout assetBaseUrl={assetBaseUrl} batter={batter} />}
      {safeVariant === 'lower_third' && <LowerThirdLayout assetBaseUrl={assetBaseUrl} batter={batter} />}
    </BroadcastShell>
  );
}
