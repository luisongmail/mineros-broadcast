import { useMemo, useState } from 'react';

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10',
  lg: 'h-14 w-14',
} as const;

export interface TeamLogoProps {
  assetId: string;
  alt: string;
  size?: keyof typeof sizeClasses;
  baseUrl?: string;
}

function getInitials(label: string) {
  const sanitized = label.trim();

  if (!sanitized) {
    return 'TM';
  }

  const letters = sanitized
    .split(/\s+/)
    .map((segment) => segment[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return letters || sanitized.slice(0, 2).toUpperCase();
}

function resolveAssetUrl(assetId: string, baseUrl?: string) {
  const trimmedAssetId = assetId.trim();

  if (!trimmedAssetId || /^[./\\]/.test(trimmedAssetId)) {
    return null;
  }

  if (!baseUrl) {
    return `/assets/${encodeURIComponent(trimmedAssetId)}`;
  }

  return `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(trimmedAssetId)}`;
}

export function TeamLogo({ assetId, alt, size = 'md', baseUrl }: TeamLogoProps) {
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => resolveAssetUrl(assetId, baseUrl), [assetId, baseUrl]);
  const initials = useMemo(() => getInitials(alt), [alt]);
  const sharedClassName = `${sizeClasses[size]} rounded-[4px] border border-white/10 object-contain p-1`;

  if (!src || hasError) {
    return (
      <div
        aria-label={alt}
        className={`${sharedClassName} flex items-center justify-center bg-white/10 font-inter text-xs font-bold uppercase tracking-[0.18em] text-white`}
        role="img"
      >
        {initials}
      </div>
    );
  }

  return (
    <img
      alt={alt}
      className={`${sharedClassName} bg-white/5`}
      loading="lazy"
      src={src}
      onError={() => setHasError(true)}
    />
  );
}
