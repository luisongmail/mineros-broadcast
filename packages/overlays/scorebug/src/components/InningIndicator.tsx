export interface InningIndicatorProps {
  inning: number;
  inningHalf: 'top' | 'bottom';
}

export function InningIndicator({ inning, inningHalf }: InningIndicatorProps) {
  const arrow = inningHalf === 'top' ? '▲' : '▼';
  const label = inningHalf === 'top' ? 'ALTA' : 'BAJA';

  return (
    <div className="flex items-center gap-1 text-white">
      <span aria-hidden="true" className="font-bebas text-lg leading-none text-minerosGold">
        {arrow}
      </span>
      <div className="flex flex-col leading-none">
        <span className="font-bebas text-[22px] tracking-[0.08em]">{inning}</span>
        <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-white/80">
          {label}
        </span>
      </div>
    </div>
  );
}
