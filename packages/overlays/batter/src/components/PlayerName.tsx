export interface PlayerNameProps {
  name: string;
  className?: string;
}

export function PlayerName({ name, className = '' }: PlayerNameProps) {
  return <span className={`font-bebas text-[48px] uppercase leading-none tracking-[0.03em] text-white ${className}`.trim()}>{name}</span>;
}
