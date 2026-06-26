// ---------------------------------------------------------------------------
// PitchGrid — grilla de lanzamiento con coordenadas físicas métricas
// Sistema de referencia: MLBAM, adaptado a unidades métricas
// plate_x: metros desde centro del plato (izq negativo, der positivo)
// plate_z: metros desde el suelo
// Zona 1-9 = strike (MLBAM), 11-14 = bola
// ---------------------------------------------------------------------------

export interface PitchGridCell {
  col: number;      // 0-6 de izquierda a derecha (vista del receptor)
  row: number;      // 0-6 de arriba a abajo
  plate_x: number;  // metros desde centro del plato
  plate_z: number;  // metros desde el suelo
  zone: number;     // zona MLBAM (1-9 strike, 11-14 bola)
}

export type ZoneClass = 'heart' | 'zone' | 'edge' | 'near_edge' | 'chase' | 'waste';

type BatterSide = 'R' | 'L' | 'S' | 'unknown';
type ActiveBatterSide = 'R' | 'L' | null;

// Dimensiones físicas de la cuadrícula en metros
const GRID_X_MIN = -0.55;  // metros desde centro del plato
const GRID_X_MAX = +0.55;
const GRID_Z_MIN = 0.10;   // metros sobre el suelo (borde inferior de la grilla)
const GRID_Z_MAX = 1.50;   // metros sobre el suelo (borde superior de la grilla)
const GRID_COLS = 7;
const GRID_ROWS = 7;

// Zona de strike por defecto (adulto promedio béisbol)
const DEFAULT_SZ_TOP = 1.07;
const DEFAULT_SZ_BOTTOM = 0.47;

// Ancho del home plate en metros (17 pulgadas)
const HALF_PLATE = 0.2159;

interface PitchGridProps {
  activeBattingSide: ActiveBatterSide;
  batterSide: BatterSide;
  onSelect: (cell: PitchGridCell) => void;
  selectedCell: PitchGridCell | null;
  showTacticalInfo?: boolean;
  /** Tope de zona del bateador en metros (por defecto: 1.07m) */
  szTop?: number;
  /** Fondo de zona del bateador en metros (por defecto: 0.47m) */
  szBottom?: number;
}

// Convierte posición de celda a coordenadas físicas métricas (centro de la celda)
export function cellToPhysical(col: number, row: number): { plate_x: number; plate_z: number } {
  const cellW = (GRID_X_MAX - GRID_X_MIN) / GRID_COLS;
  const cellH = (GRID_Z_MAX - GRID_Z_MIN) / GRID_ROWS;
  const plate_x = Math.round((GRID_X_MIN + (col + 0.5) * cellW) * 10000) / 10000;
  const plate_z = Math.round((GRID_Z_MAX - (row + 0.5) * cellH) * 10000) / 10000;
  return { plate_x, plate_z };
}

// Calcula zona MLBAM desde coordenadas métricas
export function calculateZoneFromCoords(
  plateX: number,
  plateZ: number,
  szTop = DEFAULT_SZ_TOP,
  szBottom = DEFAULT_SZ_BOTTOM,
): number {
  const thirdW = (HALF_PLATE * 2) / 3;
  const thirdH = (szTop - szBottom) / 3;
  const inStrike = Math.abs(plateX) <= HALF_PLATE && plateZ >= szBottom && plateZ <= szTop;

  if (!inStrike) {
    if (plateZ > szTop) return 11;
    if (plateZ < szBottom) return 12;
    return plateX < 0 ? 13 : 14;
  }

  const col = plateX < -thirdW ? 0 : plateX > thirdW ? 2 : 1;
  const row = plateZ > szTop - thirdH ? 0 : plateZ < szBottom + thirdH ? 2 : 1;
  return row * 3 + col + 1;
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
  if (batterSide === 'S' && activeBattingSide === null) return 'Ambas lecturas';
  if (activeBattingSide === null) return 'Selecciona lado';
  if (col === 3) return 'Centro';
  if (activeBattingSide === 'R') return col <= 2 ? 'Adentro' : 'Afuera';
  if (activeBattingSide === 'L') return col >= 4 ? 'Adentro' : 'Afuera';
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

export function PitchGrid({
  activeBattingSide,
  batterSide,
  onSelect,
  selectedCell,
  showTacticalInfo = true,
  szTop = DEFAULT_SZ_TOP,
  szBottom = DEFAULT_SZ_BOTTOM,
}: PitchGridProps) {
  const handleCellClick = (col: number, row: number) => {
    const { plate_x, plate_z } = cellToPhysical(col, row);
    const zone = calculateZoneFromCoords(plate_x, plate_z, szTop, szBottom);
    onSelect({ col, row, plate_x, plate_z, zone });
  };

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
                onClick={() => handleCellClick(col, row)}
                type="button"
                title={`${zoneClass.toUpperCase()} · ${cellToPhysical(col, row).plate_x > 0 ? '+' : ''}${cellToPhysical(col, row).plate_x.toFixed(2)}m / ${cellToPhysical(col, row).plate_z.toFixed(2)}m`}
              >
                {selected ? '●' : ''}
              </button>
            );
          }),
        )}
      </div>

      <div className={`grid gap-2 text-xs text-white/70 ${showTacticalInfo ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Zona</span>
          <span className="font-semibold text-white">
            {selectedCell ? `${ZONE_LABELS[classifyZone(selectedCell.col, selectedCell.row)]} · Z${selectedCell.zone}` : 'Sin selección'}
          </span>
        </div>
        {showTacticalInfo ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
            <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Lectura táctica</span>
            <span className="font-semibold text-white">
              {selectedCell ? getTacticalSide(selectedCell.col, activeBattingSide, batterSide) : 'Selecciona una celda'}
            </span>
          </div>
        ) : null}
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Posición (m)</span>
          <span className="font-mono font-semibold text-white">
            {selectedCell
              ? `${selectedCell.plate_x >= 0 ? '+' : ''}${selectedCell.plate_x.toFixed(2)} / ${selectedCell.plate_z.toFixed(2)}`
              : '—'}
          </span>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="block text-[10px] uppercase tracking-[0.2em] text-white/40">Zona MLBAM</span>
          <span className="font-bebas text-xl font-semibold text-mineros-gold">{selectedCell ? selectedCell.zone : '—'}</span>
        </div>
      </div>
    </div>
  );
}
