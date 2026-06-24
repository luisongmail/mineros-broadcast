export interface PlayerNumberProps {
  number?: string;
  className?: string;
}

export function PlayerNumber({ number, className = '' }: PlayerNumberProps) {
  if (!number) {
    return null;
  }

  return <span className={`font-bebas text-[42px] leading-none text-mineros-gold ${className}`.trim()}>{number}</span>;
}
