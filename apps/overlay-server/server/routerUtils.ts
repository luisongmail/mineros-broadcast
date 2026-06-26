import type { Response } from 'express';

export interface ApiSuccessResponse {
  status: number;
  result: 'ok';
  payload: unknown;
}

export interface ApiErrorResponse {
  status: number;
  result: 'error';
  payload: {
    message: string;
  };
}

export function sendOk(response: Response, payload: unknown, status = 200): void {
  const body: ApiSuccessResponse = {
    status,
    result: 'ok',
    payload,
  };

  response.status(status).json(body);
}

export function sendErr(response: Response, message: string, status = 400): void {
  const body: ApiErrorResponse = {
    status,
    result: 'error',
    payload: { message },
  };

  response.status(status).json(body);
}

export function sendCaughtError(response: Response, error: unknown, fallbackMessage: string): void {
  const message = error instanceof Error ? error.message : fallbackMessage;
  sendErr(response, message || fallbackMessage, 500);
}

export function requireString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`${fieldName} es requerido`);
  }

  return value.trim();
}

export function optionalString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

export function optionalInteger(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number.parseInt(value, 10);
    return Number.isInteger(parsed) ? parsed : null;
  }

  return null;
}

export function optionalBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    if (value === 1) return true;
    if (value === 0) return false;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'si'].includes(normalized)) return true;
    if (['false', '0', 'no'].includes(normalized)) return false;
  }

  return null;
}

export function optionalArrayOfStrings(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const items = value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter((entry) => entry.length > 0);

  return items;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseJsonColumn<T>(value: unknown, fallback: T): T {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  }

  return value !== undefined && value !== null ? (value as T) : fallback;
}

export function toIsoString(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }

  return typeof value === 'string' ? value : String(value);
}

export function toTinyInt(value: boolean): 0 | 1 {
  return value ? 1 : 0;
}
