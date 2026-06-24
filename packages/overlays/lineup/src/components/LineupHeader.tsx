interface LineupHeaderProps {
  team: {
    name: string;
    shortName: string;
  };
  logoUrl?: string;
}

export function LineupHeader({ team, logoUrl }: LineupHeaderProps) {
  return (
    <header className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[6px] border border-mineros-gold/50 bg-broadcast-black/40">
          {logoUrl ? (
            <img src={logoUrl} alt={`${team.name} logo`} className="h-full w-full object-cover" />
          ) : (
            <span className="font-bebas text-2xl uppercase tracking-[0.12em] text-mineros-gold">{team.shortName}</span>
          )}
        </div>

        <div>
          <p className="font-bebas text-[18px] uppercase tracking-[0.18em] text-mineros-gold">Lineup oficial</p>
          <h2 className="font-bebas text-[38px] uppercase leading-none tracking-[0.06em] text-white">{team.name}</h2>
        </div>
      </div>

      <div className="rounded-[4px] border border-white/10 bg-white/5 px-3 py-2 text-right">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">Orden al bate</p>
        <p className="font-bebas text-[24px] leading-none text-white">{team.shortName}</p>
      </div>
    </header>
  );
}
