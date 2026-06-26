import { describe, it, expect, vi } from 'vitest';
import { CsvFileImportAdapter } from './CsvFileImportAdapter';
import type { NormalizedPitchData } from './types';
import { MPH_TO_KMH, FT_TO_M, IN_TO_CM } from './types';

const RAPSODO_CSV = `Pitch Type,Release Speed,Spin Rate,Spin Axis,Horizontal Break,Vertical Break,Strike Zone Side,Strike Zone Height
FF,92.5,2350,215,-4.2,8.1,-0.75,2.6
SL,84.0,2100,180,3.5,-2.5,0.35,2.1
CH,82.3,1800,190,-5.0,5.0,-0.20,2.4
`;

const TRACKMAN_CSV = `PitchType,RelSpeed,SpinRate,SpinAxis,HorzBreak,InducedVertBreak,PlateLocSide,PlateLocHeight
FF,93.1,2400,220,-4.5,8.5,-0.80,2.65
SL,84.5,2050,175,3.8,-2.8,0.40,2.15
`;

describe('CsvFileImportAdapter', () => {
  it('se inicializa correctamente', async () => {
    const adapter = new CsvFileImportAdapter('test-csv');
    expect(adapter.deviceId).toBe('test-csv');
    expect(adapter.protocol).toBe('file-import');
    expect(await adapter.healthCheck()).toBe('error');

    await adapter.connect({ deviceId: 'test-csv' });
    expect(await adapter.healthCheck()).toBe('ok');
  });

  it('importa CSV de Rapsodo y emite pitcheos normalizados', async () => {
    const adapter = new CsvFileImportAdapter();
    await adapter.connect({ deviceId: 'csv-import' });

    const received: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => received.push(d));

    const result = adapter.importCsvContent(RAPSODO_CSV, 'rapsodo');
    expect(result.imported).toBe(3);
    expect(result.skipped).toBe(0);
    expect(received).toHaveLength(3);

    const ff = received[0]!;
    expect(ff.startSpeed).toBeCloseTo(92.5 * MPH_TO_KMH, 1);
    expect(ff.plateX).toBeCloseTo(-0.75 * FT_TO_M, 3);
    expect(ff.plateZ).toBeCloseTo(2.6 * FT_TO_M, 3);
    expect(ff.pfxX).toBeCloseTo(-4.2 * IN_TO_CM, 2);
    expect(ff.pfxZ).toBeCloseTo(8.1 * IN_TO_CM, 2);
    expect(ff.pitchClass).toBe('FF');
    expect(ff.spinRate).toBe(2350);
    expect(ff.rawData).toBeDefined();
  });

  it('importa CSV de Trackman y detecta formato automáticamente', async () => {
    const adapter = new CsvFileImportAdapter();
    await adapter.connect({ deviceId: 'csv-import' });

    const received: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => received.push(d));

    const result = adapter.importCsvContent(TRACKMAN_CSV, 'auto');
    expect(result.imported).toBe(2);

    const ff = received[0]!;
    expect(ff.startSpeed).toBeCloseTo(93.1 * MPH_TO_KMH, 1);
    expect(ff.pitchClass).toBe('FF');
  });

  it('omite filas sin datos de ubicación en el plato', async () => {
    const csv = `Pitch Type,Release Speed,Strike Zone Side,Strike Zone Height\nFF,90,,\nSL,85,0.5,2.5\n`;
    const adapter = new CsvFileImportAdapter();
    await adapter.connect({ deviceId: 'csv-import' });

    const received: NormalizedPitchData[] = [];
    adapter.onPitchData((d) => received.push(d));

    const result = adapter.importCsvContent(csv, 'rapsodo');
    expect(result.skipped).toBe(1);
    expect(result.imported).toBe(1);
  });

  it('cancela la suscripción de pitcheos correctamente', async () => {
    const adapter = new CsvFileImportAdapter();
    await adapter.connect({ deviceId: 'csv-import' });

    const handler = vi.fn();
    const unsubscribe = adapter.onPitchData(handler);
    unsubscribe();

    adapter.importCsvContent(RAPSODO_CSV, 'rapsodo');
    expect(handler).not.toHaveBeenCalled();
  });

  it('devuelve { imported: 0, skipped: 0 } para CSV vacío', async () => {
    const adapter = new CsvFileImportAdapter();
    await adapter.connect({ deviceId: 'csv-import' });
    expect(adapter.importCsvContent('')).toEqual({ imported: 0, skipped: 0 });
    expect(adapter.importCsvContent('header only\n')).toEqual({ imported: 0, skipped: 0 });
  });
});
