import { useMemo, useState } from 'react';

import type { PitcherData } from '../types';

function getInitials(name: string) {
  const trimmedName = name.trim();

  if (!trimmedName) {
    return 'MB';
  }

  const initials = trimmedName
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return initials || trimmedName.slice(0, 2).toUpperCase();
}

function resolveAssetUrl(assetId?: string, assetBaseUrl?: string) {
  const trimmedAssetId = assetId?.trim();

  if (!trimmedAssetId || /^[./\\]/.test(trimmedAssetId)) {
    return null;
  }

  if (!assetBaseUrl) {
    return `/assets/${trimmedAssetId}`;
  }

  return `${assetBaseUrl.replace(/\/$/, '')}/${trimmedAssetId}`;
}

export interface PitcherProfileProps {
  pitcher: PitcherData;
  assetBaseUrl?: string;
}

export function PitcherProfile({ pitcher, assetBaseUrl }: PitcherProfileProps) {
  const [hasError, setHasError] = useState(false);
  const initials = useMemo(() => getInitials(pitcher.name), [pitcher.name]);
  const src = useMemo(() => resolveAssetUrl(pitcher.photoAssetId, assetBaseUrl), [pitcher.photoAssetId, assetBaseUrl]);
  const photoClassName = 'h-[112px] w-[96px] overflow-hidden rounded-[6px] border border-mineros-gold/35 bg-white/5';

  return (
    <div className="flex min-w-[320px] items-center gap-4 px-5 py-4 text-white">
      {!src || hasError ? (
        <div
          aria-label={`Placeholder de ${pitcher.name}`}
          className={`${photoClassName} flex items-center justify-center font-bebas text-[40px] uppercase leading-none text-mineros-gold`}
          role="img"
        >
          {initials}
        </div>
      ) : (
        <img alt={pitcher.name} className={`${photoClassName} object-cover`} loading="lazy" src={src} onError={() => setHasError(true)} />
      )}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-end gap-3">
          {pitcher.number && <span className="font-bebas text-[38px] leading-none text-mineros-gold">#{pitcher.number}</span>}
          <span className="truncate font-bebas text-[42px] uppercase leading-none tracking-[0.03em]">{pitcher.name}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 font-inter text-sm font-semibold uppercase tracking-[0.14em] text-white/80">
          <span className="rounded-[4px] border border-mineros-gold bg-mineros-navy px-3 py-1 text-mineros-gold">P</span>
          {pitcher.throws && <span>Lanza {pitcher.throws}</span>}
        </div>
      </div>
    </div>
  );
}
