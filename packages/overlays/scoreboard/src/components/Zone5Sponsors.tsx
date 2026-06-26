import { useEffect, useMemo, useRef, useState } from 'react';

import { resolveAssetUrl } from './TeamBadge';
import type { ScoreboardSponsor, ScoreboardSponsorGridConfig } from '../types';

const DEFAULT_TRANSITION_MS = 450;
const DEFAULT_HOLD_MS = 5000;

function SponsorCard({
  sponsor,
  assetBaseUrl,
  width,
}: {
  sponsor: ScoreboardSponsor;
  assetBaseUrl?: string;
  width: number;
}) {
  const src = resolveAssetUrl(assetBaseUrl, sponsor.logoAssetId);
  const fallback = sponsor.displayName.trim().slice(0, 1).toUpperCase() || 'M';

  return (
    <article
      className="flex shrink-0 items-center gap-4 rounded-[6px] border border-white/8 bg-black/20 px-5 py-4"
      style={{ width }}
    >
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[6px] font-bebas text-[30px] text-white shadow-[0px_2px_8px_rgba(0,0,0,.25)]" style={{ backgroundColor: sponsor.logoAssetId ? '#1B2F5B' : '#D71920' }}>
        {src ? <img alt={sponsor.displayName} className="h-10 w-10 object-contain" src={src} /> : fallback}
      </div>
      <div className="min-w-0">
        <div className="truncate font-bebas text-[28px] uppercase leading-none tracking-[0.03em] text-white">{sponsor.displayName}</div>
        <div className="mt-2 truncate text-[14px] text-[#9CA3AF]">{sponsor.text ?? 'Auspiciador oficial de la transmisión'}</div>
      </div>
    </article>
  );
}

function PlaceholderCard({ width }: { width: number }) {
  return (
    <article className="flex shrink-0 items-center gap-4 rounded-[6px] border border-dashed border-white/15 bg-black/10 px-5 py-4" style={{ width }}>
      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-[6px] bg-[#111111] font-bebas text-[30px] text-[#D4AF37]">→</div>
      <div>
        <div className="font-bebas text-[26px] uppercase leading-none tracking-[0.03em] text-white">Siguiente sponsor</div>
        <div className="mt-2 text-[14px] text-[#9CA3AF]">Espacio reservado para la siguiente campaña activa.</div>
      </div>
    </article>
  );
}

export function Zone5Sponsors({
  sponsors,
  sponsorGrid,
  assetBaseUrl,
  isPaused = false,
}: {
  sponsors: ScoreboardSponsor[];
  sponsorGrid?: ScoreboardSponsorGridConfig;
  assetBaseUrl?: string;
  isPaused?: boolean;
}) {
  const activeSponsors = useMemo(
    () => sponsors.filter((item) => item.active !== false).sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999)),
    [sponsors],
  );
  const visibleCards = Math.max(1, sponsorGrid?.visibleCards ?? 3);
  const transitionMs = sponsorGrid?.transitionMs ?? DEFAULT_TRANSITION_MS;
  const holdMs = sponsorGrid?.holdMs ?? DEFAULT_HOLD_MS;
  const cardGapPx = sponsorGrid?.cardGapPx ?? 16;
  const showPartialNextCard = sponsorGrid?.showPartialNextCard ?? true;
  const totalCards = Math.max(activeSponsors.length, 1);

  // Measure container width to avoid hardcoded values
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setContainerWidth(el.offsetWidth);
    const ro = new ResizeObserver(() => setContainerWidth(el.offsetWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const partialWidth = showPartialNextCard && activeSponsors.length > visibleCards ? 140 : 0;
  const totalGaps = (visibleCards - 1) * cardGapPx;
  const cardWidth = containerWidth > 0
    ? Math.floor((containerWidth - totalGaps - partialWidth) / visibleCards)
    : 400; // fallback while measuring

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isPaused || totalCards <= visibleCards) return undefined;
    const timer = window.setTimeout(() => setIsAnimating(true), holdMs);
    return () => window.clearTimeout(timer);
  }, [currentIndex, holdMs, isPaused, totalCards, visibleCards]);

  useEffect(() => {
    if (!isAnimating) return undefined;
    const timer = window.setTimeout(() => {
      setCurrentIndex((index) => (index + 1) % totalCards);
      setIsAnimating(false);
    }, transitionMs);
    return () => window.clearTimeout(timer);
  }, [isAnimating, totalCards, transitionMs]);

  const cardsToRender = useMemo(() => {
    if (activeSponsors.length === 0) return [] as ScoreboardSponsor[];
    const count = totalCards <= visibleCards
      ? totalCards
      : visibleCards + (showPartialNextCard ? 1 : 0) + 1;
    return Array.from({ length: count }, (_, index) => activeSponsors[(currentIndex + index) % activeSponsors.length]);
  }, [activeSponsors, currentIndex, showPartialNextCard, totalCards, visibleCards]);

  const shift = isAnimating ? cardWidth + cardGapPx : 0;

  if (sponsorGrid?.enabled === false) return null;

  return (
    <section className="rounded-[6px] border border-white/8 bg-[#111111] px-5 py-3 shadow-[0px_2px_8px_rgba(0,0,0,.25)]">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#D4AF37]">Auspiciadores</div>
          <div className="text-[11px] text-[#9CA3AF]">Grilla configurable · {visibleCards} tarjetas visibles por defecto · animación ←</div>
        </div>
        <div className="flex items-center gap-1.5">
          {Array.from({ length: Math.min(totalCards, 8) }, (_, index) => (
            <span key={`dot-${index}`} className={`h-2 w-2 rounded-full ${index === currentIndex % Math.min(totalCards, 8) ? 'bg-[#D4AF37]' : 'bg-white/15'}`} />
          ))}
        </div>
      </div>

      <div ref={containerRef} className="overflow-hidden w-full">
        {containerWidth > 0 && (
          <div
            className={`flex ${isAnimating ? 'scoreboard-sponsor-track--animated' : ''}`}
            style={{
              gap: `${cardGapPx}px`,
              transform: `translateX(-${shift}px)`,
              transition: isAnimating ? `transform ${transitionMs}ms ease-in-out` : 'none',
            }}
          >
            {activeSponsors.length > 0 ? (
              cardsToRender.map((sponsor, index) => (
                <SponsorCard
                  key={`${sponsor.sponsorId}-${currentIndex}-${index}`}
                  assetBaseUrl={assetBaseUrl}
                  sponsor={sponsor}
                  width={cardWidth}
                />
              ))
            ) : (
              <PlaceholderCard width={cardWidth} />
            )}
          </div>
        )}
      </div>
    </section>
  );
}
