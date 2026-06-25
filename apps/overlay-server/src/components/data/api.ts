export const API = import.meta.env.VITE_API_URL ?? '';

type ApiEnvelope<T> =
  | { result: 'ok'; payload: T }
  | { result: 'error'; payload?: { message?: string }; message?: string };

function getErrorMessage(value: unknown, fallback: string): string {
  if (value instanceof Error) {
    return value.message;
  }

  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return fallback;
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const body = response.status === 204 ? undefined : isJson ? await response.json() : await response.text();

  if (!response.ok) {
    if (body && typeof body === 'object' && 'result' in body && (body as ApiEnvelope<T>).result === 'error') {
      const payload = (body as { payload?: { message?: string } }).payload;
      throw new Error(payload?.message ?? response.statusText);
    }

    throw new Error(typeof body === 'string' && body ? body : response.statusText || `HTTP ${response.status}`);
  }

  if (body && typeof body === 'object' && 'result' in body) {
    const envelope = body as ApiEnvelope<T>;
    if (envelope.result === 'error') {
      throw new Error(envelope.payload?.message ?? envelope.message ?? 'La solicitud falló.');
    }

    return envelope.payload;
  }

  return body as T;
}

export function generateId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toErrorMessage(error: unknown, fallback: string): string {
  return getErrorMessage(error, fallback);
}
