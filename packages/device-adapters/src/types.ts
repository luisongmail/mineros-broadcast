// ---------------------------------------------------------------------------
// DeviceAdapter — interfaz y tipos para dispositivos de medición de béisbol
// Sistema de referencia: métrico (metros, km/h, cm, rpm)
// Spec 29 § 5.1
// ---------------------------------------------------------------------------

export interface DeviceConfig {
  deviceId: string;
  label?: string;
  [key: string]: unknown;
}

/** Datos de lanzamiento normalizados al sistema métrico */
export interface NormalizedPitchData {
  plateX: number;       // metros (negativo = izq del bateador, positivo = der)
  plateZ: number;       // metros sobre el suelo
  startSpeed: number;   // km/h velocidad inicial
  endSpeed?: number;    // km/h velocidad en el plato
  spinRate?: number;    // rpm
  spinAxis?: number;    // grados (0-360)
  pfxX?: number;        // cm movimiento horizontal (MLBAM)
  pfxZ?: number;        // cm movimiento vertical (MLBAM)
  pitchClass?: string;  // código MLBAM (FF, SL, CH, CU, …)
  confidence?: number;  // 0-1 confianza de la medición
  rawData: unknown;     // payload original sin procesar
}

/** Datos de bateo normalizados */
export interface NormalizedHitData {
  exitVelocity: number;    // km/h
  launchAngle?: number;    // grados
  sprayAngle?: number;     // grados (0 = CF, -45 = RF, +45 = LF)
  distance?: number;       // metros
  confidence?: number;
  rawData: unknown;
}

/** Contrato de cualquier adaptador de dispositivo */
export interface DeviceAdapter {
  readonly deviceId: string;
  readonly protocol: 'wifi-rest' | 'bluetooth-le' | 'file-import' | 'usb-serial';

  connect(config: DeviceConfig): Promise<void>;
  disconnect(): Promise<void>;
  healthCheck(): Promise<'ok' | 'error'>;

  /** Registra un handler para datos de pitcheo; retorna función de cancelación */
  onPitchData(handler: (data: NormalizedPitchData) => void): () => void;
  /** Registra un handler para datos de bateo (opcional) */
  onHitData?(handler: (data: NormalizedHitData) => void): () => void;
}

// Constantes de conversión
export const FT_TO_M = 0.3048;         // 1 pie = 0.3048 metros
export const MPH_TO_KMH = 1.60934;     // 1 mph = 1.60934 km/h
export const IN_TO_CM = 2.54;          // 1 pulgada = 2.54 cm
