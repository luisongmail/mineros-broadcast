function getTeamMark(teamId: string) {
  const cleaned = teamId.trim();

  if (!cleaned) {
    return 'MB';
  }

  return cleaned.replace(/^team-/i, '').slice(0, 3).toUpperCase() || 'MB';
}

export interface PitcherHeaderProps {
  teamId: string;
}

export function PitcherHeader({ teamId }: PitcherHeaderProps) {
  return (
    <div className="flex items-center gap-4 border-b border-white/10 bg-broadcast-black/75 px-5 py-4 text-white">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-mineros-gold bg-mineros-red font-bebas text-2xl leading-none text-white shadow-broadcast">
        {getTeamMark(teamId)}
      </div>
      <div className="flex flex-col gap-1">
        <span className="font-bebas text-[34px] uppercase leading-none tracking-[0.04em] text-white">PITCHER EN EL CÍRCULO</span>
        <span className="font-inter text-[11px] font-semibold uppercase tracking-[0.18em] text-mineros-gold">Estado de lanzadora</span>
      </div>
    </div>
  );
}
