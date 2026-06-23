import type { ScorebugProps } from './types';

const baseDiamondClass =
  'absolute h-[14px] w-[14px] rotate-45 rounded-[2px] border border-white/35 bg-white/10';

function BaseDiamond({ active, position }: { active: boolean; position: string }) {
  return (
    <span
      aria-hidden="true"
      className={[
        baseDiamondClass,
        position,
        active && 'border-mineros-gold bg-mineros-gold shadow-[0_0_12px_rgba(212,175,55,0.45)]',
      ]
        .filter(Boolean)
        .join(' ')}
    />
  );
}

export function Scorebug({ game }: ScorebugProps) {
  const { homeTeam, awayTeam, score, inning, inningHalf, outs, bases, count } = game;
  const safeOuts = outs >= 0 && outs <= 2 ? outs : null;
  const inningMarker = inningHalf === 'bottom' ? '▼' : '▲';

  return (
    <section className="mb-shell relative h-[1080px] w-[1920px] overflow-hidden bg-transparent font-inter text-white">
      <div className="absolute bottom-[60px] left-[60px] flex min-w-[620px] items-stretch overflow-hidden rounded-[6px] border-2 border-mineros-gold bg-mineros-navy shadow-[0px_10px_28px_rgba(0,0,0,0.38)]">
        <div className="w-2 bg-mineros-red" />

        <div className="flex items-center gap-[18px] bg-gradient-to-r from-mineros-dark to-mineros-navy px-[18px] py-4">
          <div className="flex items-center gap-3">
            <span className="text-[22px] font-extrabold uppercase leading-none tracking-[0.08em]">{awayTeam.shortName}</span>
            <span className="text-[34px] font-black leading-none">{score.away}</span>
          </div>

          <div className="self-stretch border-l border-white/15" />

          <div className="flex items-center gap-3">
            <span className="text-[34px] font-black leading-none">{score.home}</span>
            <span className="text-[22px] font-extrabold uppercase leading-none tracking-[0.08em] text-mineros-gold">
              {homeTeam.shortName}
            </span>
          </div>
        </div>

        <div className="w-[3px] bg-mineros-gold" />

        <div className="flex items-center gap-[10px] border-l border-white/10 bg-mineros-dark px-4 py-[14px]">
          <span className="text-2xl leading-none text-mineros-gold">{inningMarker}</span>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white/70">Inning</span>
            <span className="text-[28px] font-black leading-none">{inning}</span>
          </div>
        </div>

        <div className="w-px bg-white/15" />

        <div className="flex items-center gap-4 bg-mineros-dark px-4 py-[14px]">
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white/70">Outs</span>
            <div className="flex items-center gap-[6px]" aria-hidden="true">
              {[0, 1, 2].map((index) => (
                <span
                  key={index}
                  className={[
                    'h-[11px] w-[11px] rounded-full border border-white/30 bg-white/15',
                    safeOuts !== null && index < safeOuts && 'bg-mineros-red shadow-[0_0_10px_rgba(215,25,32,0.45)]',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                />
              ))}
            </div>
            {safeOuts !== null && <span className="sr-only">{safeOuts === 2 ? `${safeOuts} OUTS` : `${safeOuts} OUT`}</span>}
          </div>

          <div className="self-stretch border-l border-white/10" />

          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold uppercase leading-none tracking-[0.12em] text-white/70">Bases</span>
            <div className="relative h-7 w-11" aria-hidden="true">
              <BaseDiamond active={bases.second} position="left-[15px] top-0" />
              <BaseDiamond active={bases.third} position="left-[3px] top-3" />
              <BaseDiamond active={bases.first} position="left-[27px] top-3" />
            </div>
            <span className="sr-only">1B:{bases.first ? '●' : '○'}</span>
            <span className="sr-only">2B:{bases.second ? '●' : '○'}</span>
            <span className="sr-only">3B:{bases.third ? '●' : '○'}</span>
          </div>
        </div>

        {count && (
          <>
            <div className="w-px bg-white/15" />
            <div className="flex min-w-[84px] flex-col justify-center gap-[6px] bg-[#08101F] px-4 py-[14px]">
              <span className="text-[18px] font-extrabold leading-none">B {count.balls}</span>
              <span className="text-[18px] font-extrabold leading-none">S {count.strikes}</span>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
