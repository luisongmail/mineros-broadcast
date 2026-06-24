export interface PositionBadgeProps {
  position?: string;
  className?: string;
}

export function PositionBadge({ position, className = '' }: PositionBadgeProps) {
  if (!position) {
    return null;
  }

  return (
    <span
      className={[
        'inline-flex items-center rounded-[4px] border border-mineros-gold bg-broadcast-black/40 px-3 py-1 font-inter text-sm font-semibold uppercase tracking-[0.14em] text-mineros-gold',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {position}
    </span>
  );
}
