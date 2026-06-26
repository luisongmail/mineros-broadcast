export interface PitchGridCell {
  col: number;
  row: number;
}

type BatterSide = 'R' | 'L' | 'S' | 'unknown';
type ActiveBatterSide = 'R' | 'L' | null;

interface PitchGridProps {
  activeBattingSide: ActiveBatterSide;
  batterSide: BatterSide;
  onSelect: (cell: PitchGridCell) => void;
  selectedCell: PitchGridCell | null;
}

function isStrikeZoneCell(col: number, row: number): boolean {
  return col >= 2 && col <= 4 && row >= 2 && row <= 4;
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

export function PitchGrid({ activeBattingSide, batterSide, onSelect, selectedCell }: PitchGridProps) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-7 gap-1 rounded-2xl border border-white/10 bg-black/30 p-2">
        {Array.from({ length: 7 }, (_, row) =>
          Array.from({ length: 7 }, (_, col) => {
            const selected = selectedCell?.col === col && selectedCell?.row === row;
            const strikeZone = isStrikeZoneCell(col, row);

            return (
              <button
                key={`${row}-${col}`}
                className={[
                  'aspect-square rounded-md border text-[11px] font-semibold transition',
                  strikeZone
                    ? 'border-mineros-gold/40 bg-mineros-gold/10 text-mineros-gold'
                    : 'border-white/10 bg-white/5 text-white/55 hover:border-white/30 hover:bg-white/10',
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
          <span className="font-semibold text-white">{selectedCell ? (isStrikeZoneCell(selectedCell.col, selectedCell.row) ? 'Strike' : 'Bola') : 'Sin selección'}</span>
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
