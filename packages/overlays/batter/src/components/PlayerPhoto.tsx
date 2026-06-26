import { useMemo, useState } from 'react';

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

export interface PlayerPhotoProps {
  name: string;
  photoAssetId?: string;
  assetBaseUrl?: string;
  className?: string;
}

export function PlayerPhoto({ name, photoAssetId, assetBaseUrl, className = 'h-[120px] w-[120px]' }: PlayerPhotoProps) {
  const [hasError, setHasError] = useState(false);
  const initials = useMemo(() => getInitials(name), [name]);
  const src = useMemo(() => resolveAssetUrl(photoAssetId, assetBaseUrl), [photoAssetId, assetBaseUrl]);
  const sharedClassName = `${className} overflow-hidden rounded-[6px] border border-mineros-gold/40 bg-white/5`;

  if (!src || hasError) {
    return (
      <div
        aria-label={`Placeholder de ${name}`}
        className={`${sharedClassName} flex items-center justify-center font-bebas text-[48px] uppercase leading-none text-mineros-gold`}
        role="img"
      >
        {initials}
      </div>
    );
  }

  return <img alt={name} className={`${sharedClassName} object-cover`} loading="lazy" src={src} onError={() => setHasError(true)} />;
}
