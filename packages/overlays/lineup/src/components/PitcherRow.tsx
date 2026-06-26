interface PitcherRowProps {
  pitcher: {
    name: string;
    number?: string;
  };
  photoUrl?: string;
}

export function PitcherRow({ pitcher, photoUrl }: PitcherRowProps) {
  return (
    <section className="mt-3 rounded-[6px] border border-mineros-gold/35 bg-broadcast-black/30 p-3" aria-label="Pitcher abridora">
      <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-mineros-gold">Pitcher abridora</p>

      <div className="mt-2 flex items-center gap-3">
        <div className="flex h-[52px] w-[68px] items-center justify-center overflow-hidden rounded-[4px] bg-white/10">
          {photoUrl ? (
            <img src={photoUrl} alt={pitcher.name} className="h-full w-full object-cover" />
          ) : (
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white/70">Foto</span>
          )}
        </div>

        <div className="min-w-0">
          <p className="font-bebas text-[24px] uppercase leading-none tracking-[0.05em] text-white">{pitcher.name}</p>
          {pitcher.number && <p className="mt-1 font-bebas text-[19px] leading-none text-mineros-gold">#{pitcher.number}</p>}
        </div>
      </div>
    </section>
  );
}
