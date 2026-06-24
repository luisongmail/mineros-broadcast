export interface OutsIndicatorProps {
  outs: number;
}

export function OutsIndicator({ outs }: OutsIndicatorProps) {
  return (
    <div className="flex items-center gap-1.5" role="status" aria-label={`${outs} out${outs === 1 ? '' : 's'}`}>
      {Array.from({ length: 2 }, (_, index) => {
        const active = index < outs;

        return (
          <span
            key={index}
            aria-hidden="true"
            className={[
              'h-2.5 w-2.5 rounded-full border border-white/50',
              active ? 'bg-minerosRed' : 'bg-transparent',
            ].join(' ')}
          />
        );
      })}
      <span className="font-inter text-[10px] font-semibold uppercase tracking-[0.16em] text-white/90">
        {outs} OUT{outs === 1 ? '' : 'S'}
      </span>
    </div>
  );
}
