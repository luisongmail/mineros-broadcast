export interface PlayerStatusProps {
  status: string;
  className?: string;
}

export function PlayerStatus({ status, className = '' }: PlayerStatusProps) {
  return (
    <span
      className={[
        'inline-flex w-fit items-center rounded-[4px] bg-mineros-red px-3 py-1 font-inter text-sm font-bold uppercase tracking-[0.16em] text-white shadow-broadcast',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {status}
    </span>
  );
}
