// ---------------------------------------------------------------------------
// RapsodoAdapter — integración WiFi REST con unidad Rapsodo Pitching
// Protocolo: HTTP polling contra el servidor local que corre en la unidad
// Unidades de origen: mph, pies, pulgadas → convertido a métrico
// Spec 29 § 5.2
// ---------------------------------------------------------------------------

import type { DeviceAdapter, DeviceConfig, NormalizedPitchData } from './types';
import { MPH_TO_KMH, FT_TO_M, IN_TO_CM } from './types';

export interface RapsodoConfig extends DeviceConfig {
  /** IP o hostname de la unidad Rapsodo en la red local (ej: "192.168.1.200") */
  host: string;
  /** Puerto HTTP de la API (default: 8080) */
  port?: number;
  /** Intervalo de polling en ms (default: 500ms = ~2 req/s) */
  pollIntervalMs?: number;
  /** Timeout de conexión en ms (default: 3000ms) */
  timeoutMs?: number;
}

/** Payload raw de la API de Rapsodo (formato conocido del SDK) */
interface RapsodoRawPitch {
  PitchType?: string;
  AutoPitchType?: string;
  TaggedPitchType?: string;
  ReleaseSpeed?: number;      // mph
  SpinRate?: number;          // rpm
  SpinAxis?: number;          // grados
  HorzBreak?: number;         // pulgadas
  InducedVertBreak?: number;  // pulgadas
  PlateLocSide?: number;      // pies desde centro
  PlateLocHeight?: number;    // pies sobre suelo
  Extension?: number;         // pies (extensión del lanzador)
  ReleaseHeight?: number;     // pies
  ReleaseSide?: number;       // pies
  PitchUID?: string;
  PitchTime?: string;
}

/** Estado interno del polling */
interface PollState {
  lastPitchUID: string | null;
  intervalId: ReturnType<typeof setInterval> | null;
}

/** Convierte un pitch raw de Rapsodo a NormalizedPitchData */
function normalizeRapsodoPitch(raw: RapsodoRawPitch): NormalizedPitchData | null {
  const speed = raw.ReleaseSpeed;
  const plateX = raw.PlateLocSide;
  const plateZ = raw.PlateLocHeight;

  if (speed == null || plateX == null || plateZ == null) return null;

  return {
    plateX: plateX * FT_TO_M,
    plateZ: plateZ * FT_TO_M,
    startSpeed: speed * MPH_TO_KMH,
    spinRate: raw.SpinRate,
    spinAxis: raw.SpinAxis,
    pfxX: raw.HorzBreak != null ? raw.HorzBreak * IN_TO_CM : undefined,
    pfxZ: raw.InducedVertBreak != null ? raw.InducedVertBreak * IN_TO_CM : undefined,
    pitchClass: raw.AutoPitchType ?? raw.TaggedPitchType ?? raw.PitchType,
    confidence: 1.0,
    rawData: raw,
  };
}

export class RapsodoAdapter implements DeviceAdapter {
  readonly deviceId: string;
  readonly protocol = 'wifi-rest' as const;

  private host = '';
  private port = 8080;
  private pollIntervalMs = 500;
  private timeoutMs = 3000;
  private connected = false;

  private pitchHandlers: Array<(data: NormalizedPitchData) => void> = [];
  private hitHandlers:   Array<(data: import('./types').NormalizedHitData) => void> = [];

  private state: PollState = { lastPitchUID: null, intervalId: null };

  constructor(deviceId = 'rapsodo-1') {
    this.deviceId = deviceId;
  }

  async connect(config: RapsodoConfig): Promise<void> {
    this.host           = config.host;
    this.port           = config.port           ?? 8080;
    this.pollIntervalMs = config.pollIntervalMs ?? 500;
    this.timeoutMs      = config.timeoutMs      ?? 3000;

    // Verificar conectividad antes de arrancar el polling
    const health = await this.healthCheck();
    if (health === 'error') {
      throw new Error(`No se pudo conectar a Rapsodo en ${this.host}:${this.port}`);
    }

    this.connected = true;
    this.startPolling();
  }

  async disconnect(): Promise<void> {
    this.stopPolling();
    this.connected = false;
    this.pitchHandlers = [];
    this.hitHandlers   = [];
  }

  async healthCheck(): Promise<'ok' | 'error'> {
    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), this.timeoutMs);
      const resp = await fetch(`http://${this.host}:${this.port}/api/health`, {
        signal: controller.signal,
      });
      clearTimeout(tid);
      return resp.ok ? 'ok' : 'error';
    } catch {
      return 'error';
    }
  }

  onPitchData(handler: (data: NormalizedPitchData) => void): () => void {
    this.pitchHandlers.push(handler);
    return () => { this.pitchHandlers = this.pitchHandlers.filter((h) => h !== handler); };
  }

  onHitData(handler: (data: import('./types').NormalizedHitData) => void): () => void {
    this.hitHandlers.push(handler);
    return () => { this.hitHandlers = this.hitHandlers.filter((h) => h !== handler); };
  }

  // ---------------------------------------------------------------------------
  // Polling interno
  // ---------------------------------------------------------------------------

  private startPolling(): void {
    if (this.state.intervalId) return;
    this.state.intervalId = setInterval(() => {
      void this.pollOnce();
    }, this.pollIntervalMs);
  }

  private stopPolling(): void {
    if (this.state.intervalId) {
      clearInterval(this.state.intervalId);
      this.state.intervalId = null;
    }
    this.state.lastPitchUID = null;
  }

  private async pollOnce(): Promise<void> {
    if (!this.connected) return;

    try {
      const controller = new AbortController();
      const tid = setTimeout(() => controller.abort(), this.timeoutMs);

      const resp = await fetch(`http://${this.host}:${this.port}/api/lastPitch`, {
        signal: controller.signal,
      });
      clearTimeout(tid);

      if (!resp.ok) return;

      const raw = await resp.json() as RapsodoRawPitch;

      // Solo procesar si es un pitch nuevo (PitchUID distinto)
      const uid = raw.PitchUID ?? null;
      if (uid && uid === this.state.lastPitchUID) return;
      this.state.lastPitchUID = uid;

      const normalized = normalizeRapsodoPitch(raw);
      if (normalized) {
        for (const handler of this.pitchHandlers) handler(normalized);
      }
    } catch {
      // Timeout o error de red — silencioso (el operador puede reconectar)
    }
  }
}
