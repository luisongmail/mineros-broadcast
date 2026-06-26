export interface PitchGridCell {
  col: number;
  row: number;
}

export type ZoneClass = 'heart' | 'zone' | 'edge' | 'near_edge' | 'chase' | 'waste';

type BatterSide = 'R' | 'L' | 'S' | 'unknown';
type ActiveBatterSide = 'R' | 'L' | null;

interface PitchGridProps {
  activeBattingSide: ActiveBatterSide;
  batterSide: BatterSide;
  onSelect: (cell: PitchGridCell) => void;
  selectedCell: PitchGridCell | null;
}

export function classifyZone(col: number, row: number): ZoneClass {
  if (col >= 2 && col <= 4 && row >= 2 && row <= 4) {
    return col === 3 && row === 3 ? 'heart' : 'zone';
  }
  const dc = Math.max(0, 2 - col, col - 4);
  const dr = Math.max(0, 2 - row, row - 4);
  if (dc <= 1 && dr <= 1) return 'edge';
  if ((dc === 2 && dr === 0) || (dc === 0 && dr === 2)) return 'near_edge';
  if (dc === 2 && dr === 2) return 'waste';
  return 'chase';
}

function getTacticalSide(col: number, activeBattingSide: ActiveBatterSide, batterSide: BatterSide): string {
  if (batterSide === 'S' && activeBattingSide === null) {
    return 'Ambas lecturas';
  }

  if (activeBattingSide === null) {
    return 'Selecciona lado';
  }

  if (col === 3) {
    return 'Centro';
  }

  if (activeBattingSide === 'R') {
    if (col <= 2) return 'Adentro';
    if (col >= 4) return 'Afuera';
  }

  if (activeBattingSide === 'L') {
    if (col >= 4) return 'Adentro';
    if (col <= 2) return 'Afuera';
  }

  return 'Centro';
}

const ZONE_LABELS: Record<ZoneClass, string> = {
  heart: 'CENTRO',
  zone: 'ZONA',
  edge: 'BORDE',
  near_edge: 'CERCA',
  chase: 'PERSECUCIÓN',
  waste: 'MUY LEJOS',
};

const ZONE_CLASSNAMES: Record<ZoneClass, string> = {
  heart: 'border-yellow-300/80 bg-yellow-300/20 text-yellow-100 hover:border-yellow-200 hover:bg-yellow-300/25',
  zone: 'border-mineros-gold/30 bg-mineros-gold/10 text-mineros-gold hover:border-mineros-gold/50 hover:bg-mineros-gold/15',
  edge: 'border-white/20 bg-white/[0.08] text-white/75 hover:border-white/35 hover:bg-white/10',
  near_edge: 'border-white/[0.12] bg-white/[0.04] text-white/65 hover:border-white/25 hover:bg-white/[0.06]',
  chase: 'border-white/[0.08] bg-black/20 text-white/55 hover:border-white/20 hover:bg-black/30',
  waste: 'border-white/[0.05] bg-black/30 text-white/45 hover:border-white/15 hover:bg-black/40',
};

export function PitchGrid({ activeBattingSide, batterSide, onSelect, selectedCell }: PitchGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-black/30 p-2">
        {Array.from({ length: 7 }, (_, row) =>
          Array.from({ length: 7 }, (_, col) => {
            const selected = selectedCell?.col === col && selectedCell?.row === row;
            const zoneClass = classifyZone(col, row);

            return (
              <button
                key={`${row}-${col}`}
                className={[
                  'aspect-square rounded-md border text-[11px] font-semibold transition',
                  ZONE_CLASSNAMES[zoneClass],
                  selected ? 'border-mineros-red bg-mineros-red text-white shadow-lg shadow-mineros-red/20' : '',
                ].join(' ')}
                onClick={() => onSelect({ col, row })}
                type="button"
              >
                {selected ? '●' : ''}
              </button>
            );
          }),
        )}
      </div>

      <div className="grid gap-2 text-xs text-white/70 sm:grid-cols-3">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Zona</span>
          <span className="font-semibold text-white">{selectedCell ? ZONE_LABELS[classifyZone(selectedCell.col, selectedCell.row)] : 'Sin selección'}</span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Lectura táctica</span>
          <span className="font-semibold text-white">
            {selectedCell ? getTacticalSide(selectedCell.col, activeBattingSide, batterSide) : 'Selecciona una celda'}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Coordenada</span>
          <span className="font-semibold text-white">{selectedCell ? `C${selectedCell.col} · R${selectedCell.row}` : '—'}</span>
        </div>
      </div>
    </div>
  );
}
