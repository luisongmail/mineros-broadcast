// ---------------------------------------------------------------------------
// CsvFileImportAdapter — importa exportaciones CSV de Rapsodo / Trackman
// Convierte desde pies/mph/pulgadas al sistema métrico (metros, km/h, cm)
// Spec 29 § 5.2
// ---------------------------------------------------------------------------

import type { DeviceAdapter, DeviceConfig, NormalizedPitchData } from './types';
import { FT_TO_M, MPH_TO_KMH, IN_TO_CM } from './types';

export type CsvFormat = 'rapsodo' | 'trackman' | 'auto';

export interface CsvFileImportConfig extends DeviceConfig {
  format?: CsvFormat;
}

/** Mapeo de columnas Rapsodo → NormalizedPitchData */
const RAPSODO_COLUMN_MAP: Record<string, keyof RawRow> = {
  'Pitch Type': 'pitchType',
  'Release Speed': 'speedMph',
  'Spin Rate': 'spinRate',
  'Spin Axis': 'spinAxis',
  'Horizontal Break': 'hBreakIn',
  'Vertical Break': 'vBreakIn',
  'Strike Zone Side': 'plateXFt',
  'Strike Zone Height': 'plateZFt',
  // Variantes de nombre
  'Velocity': 'speedMph',
  'HorzBreak': 'hBreakIn',
  'VertBreak': 'vBreakIn',
  'PlateLocSide': 'plateXFt',
  'PlateLocHeight': 'plateZFt',
};

/** Mapeo de columnas Trackman → NormalizedPitchData */
const TRACKMAN_COLUMN_MAP: Record<string, keyof RawRow> = {
  'PitchType': 'pitchType',
  'RelSpeed': 'speedMph',
  'SpinRate': 'spinRate',
  'SpinAxis': 'spinAxis',
  'HorzBreak': 'hBreakIn',
  'InducedVertBreak': 'vBreakIn',
  'PlateLocSide': 'plateXFt',
  'PlateLocHeight': 'plateZFt',
  // Variantes
  'AutoPitchType': 'pitchType',
  'TaggedPitchType': 'pitchType',
};

interface RawRow {
  pitchType?: string;
  speedMph?: number;
  spinRate?: number;
  spinAxis?: number;
  hBreakIn?: number;   // pulgadas movimiento horizontal
  vBreakIn?: number;   // pulgadas movimiento vertical
  plateXFt?: number;   // pies desde centro del plato
  plateZFt?: number;   // pies sobre el suelo
}

/** Detecta el formato del CSV por las cabeceras */
function detectFormat(headers: string[]): CsvFormat {
  const hasTrackman = headers.some((h) => ['RelSpeed', 'AutoPitchType', 'TaggedPitchType', 'InducedVertBreak'].includes(h));
  if (hasTrackman) return 'trackman';
  return 'rapsodo';
}

/** Parsea una línea CSV respetando comillas */
function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (const ch of line) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

/** Mapea una fila raw a NormalizedPitchData (conversión de unidades) */
function rawRowToNormalized(row: RawRow, rawData: unknown): NormalizedPitchData | null {
  // plateZ es requerido para calcular zona; plateX también
  if (row.plateXFt == null || row.plateZFt == null || row.speedMph == null) return null;

  return {
    plateX: row.plateXFt * FT_TO_M,
    plateZ: row.plateZFt * FT_TO_M,
    startSpeed: row.speedMph * MPH_TO_KMH,
    spinRate: row.spinRate,
    spinAxis: row.spinAxis,
    pfxX: row.hBreakIn != null ? row.hBreakIn * IN_TO_CM : undefined,
    pfxZ: row.vBreakIn != null ? row.vBreakIn * IN_TO_CM : undefined,
    pitchClass: row.pitchType?.trim() || undefined,
    rawData,
  };
}

/** Convierte el mapa de columnas + encabezados a un índice de posición */
function buildColumnIndex(
  headers: string[],
  columnMap: Record<string, keyof RawRow>,
): Map<number, keyof RawRow> {
  const index = new Map<number, keyof RawRow>();
  headers.forEach((header, i) => {
    const field = columnMap[header];
    if (field) index.set(i, field);
  });
  return index;
}

export class CsvFileImportAdapter implements DeviceAdapter {
  readonly deviceId: string;
  readonly protocol = 'file-import' as const;

  private pitchHandlers: Array<(data: NormalizedPitchData) => void> = [];
  private connected = false;

  constructor(deviceId = 'csv-import') {
    this.deviceId = deviceId;
  }

  async connect(_config: CsvFileImportConfig): Promise<void> {
    this.connected = true;
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.pitchHandlers = [];
  }

  async healthCheck(): Promise<'ok' | 'error'> {
    return this.connected ? 'ok' : 'error';
  }

  onPitchData(handler: (data: NormalizedPitchData) => void): () => void {
    this.pitchHandlers.push(handler);
    return () => {
      this.pitchHandlers = this.pitchHandlers.filter((h) => h !== handler);
    };
  }

  /**
   * Parsea un string CSV (contenido de archivo) y emite los eventos de pitcheo.
   * @param csvContent  Contenido del CSV como string
   * @param format      Forzar formato; 'auto' (default) lo detecta por cabeceras
   * @returns           Número de pitcheos importados con éxito
   */
  importCsvContent(csvContent: string, format: CsvFormat = 'auto'): { imported: number; skipped: number } {
    const lines = csvContent.split(/\r?\n/).filter((l) => l.trim().length > 0);
    if (lines.length < 2) return { imported: 0, skipped: 0 };

    const headers = parseCsvLine(lines[0]!);
    const detectedFormat = format === 'auto' ? detectFormat(headers) : format;
    const columnMap = detectedFormat === 'trackman' ? TRACKMAN_COLUMN_MAP : RAPSODO_COLUMN_MAP;
    const colIndex = buildColumnIndex(headers, columnMap);

    let imported = 0;
    let skipped = 0;

    for (let i = 1; i < lines.length; i++) {
      const cells = parseCsvLine(lines[i]!);
      const rawData: Record<string, string> = {};
      headers.forEach((h, idx) => { rawData[h] = cells[idx] ?? ''; });

      const row: RawRow = {};
      for (const [colIdx, field] of colIndex) {
        const raw = cells[colIdx];
        if (raw == null || raw === '') continue;
        if (field === 'pitchType') {
          row[field] = raw;
        } else {
          const num = parseFloat(raw);
          if (!isNaN(num)) (row as Record<string, unknown>)[field] = num;
        }
      }

      const normalized = rawRowToNormalized(row, rawData);
      if (normalized) {
        for (const handler of this.pitchHandlers) handler(normalized);
        imported++;
      } else {
        skipped++;
      }
    }

    return { imported, skipped };
  }
}
