import { useMemo, useState } from 'react';

function normalizeAbbr(abbr: string) {
  return abbr.trim().toUpperCase().slice(0, 2) || '--';
}

export function resolveAssetUrl(assetBaseUrl: string | undefined, assetId: string | undefined) {
  if (!assetBaseUrl || !assetId) {
    return undefined;
  }

  return `${assetBaseUrl.replace(/\/$/, '')}/${assetId}`;
}

export function TeamBadge({
  logoAssetId,
  abbr,
  assetBaseUrl,
  size = 'md',
}: {
  logoAssetId?: string;
  abbr: string;
  assetBaseUrl?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [hasError, setHasError] = useState(false);
  const src = useMemo(() => resolveAssetUrl(assetBaseUrl, logoAssetId), [assetBaseUrl, logoAssetId]);
  const safeAbbr = normalizeAbbr(abbr);

  const sizes: Record<NonNullable<typeof size>, string> = {
    sm: 'h-9 w-9 text-[12px]',
    md: 'h-12 w-12 text-[15px]',
    lg: 'h-16 w-16 text-[20px]',
  };

  if (src && !hasError) {
    return (
      <img
        alt={abbr}
        className={`${sizes[size]} rounded-full border border-[#D4AF37]/40 bg-[#111111] object-cover`}
        src={src}
        onError={() => setHasError(true)}
      />
    );
  }

  return (
    <div
      className={`${sizes[size]} flex items-center justify-center rounded-full border border-[#D4AF37]/40 bg-[#111111] font-bebas uppercase tracking-[0.08em] text-white`}
      data-testid={`team-badge-fallback-${safeAbbr}`}
    >
      {safeAbbr}
    </div>
  );
}
