// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import AuditTab from './AuditTab';

const mockGetAuditLogs = vi.fn();

vi.mock('../../../hooks/useAdmin', () => ({
  useAdmin: () => ({
    getAuditLogs: mockGetAuditLogs,
  }),
}));

vi.mock('../../auth/SecurityContextProvider', () => ({
  useAuth: () => ({
    timeZone: 'America/Santo_Domingo',
  }),
}));

function buildAuditResult(overrides?: Partial<{ total: number; page: number; limit: number; pages: number }>) {
  return {
    entries: [
      {
        id: 'aud_001',
        action: 'user.read',
        result: 'allowed' as const,
        actor: 'usr_001',
        resource: 'User:usr_001',
        timestamp: '2026-06-30T05:00:00.000Z',
        details: {},
      },
    ],
    total: overrides?.total ?? 1,
    page: overrides?.page ?? 1,
    limit: overrides?.limit ?? 50,
    pages: overrides?.pages ?? 3,
  };
}

function setInputValue(input: HTMLInputElement, value: string) {
  const descriptor = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
  descriptor?.set?.call(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

describe('AuditTab UI pagination/search behavior', () => {
  let container: HTMLDivElement;
  let root: Root;
  const onNotify = vi.fn();
  const setLoading = vi.fn();

  beforeEach(() => {
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    vi.useFakeTimers();
    vi.clearAllMocks();
    mockGetAuditLogs.mockResolvedValue(buildAuditResult());
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('hace carga inicial paginada y cambia de página desde UI', async () => {
    await act(async () => {
      root.render(<AuditTab onNotify={onNotify} setLoading={setLoading} />);
      await Promise.resolve();
    });

    expect(mockGetAuditLogs).toHaveBeenCalledWith({ page: 1, limit: 50 });

    const nextPageButton = container.querySelector('button[aria-label="Página siguiente"]') as HTMLButtonElement;
    expect(nextPageButton).toBeTruthy();

    await act(async () => {
      nextPageButton.click();
      await Promise.resolve();
    });

    expect(mockGetAuditLogs).toHaveBeenLastCalledWith({ page: 2, limit: 50 });
  });

  it('no dispara consulta por búsqueda menor a 3 caracteres y sí para 3+ tras debounce', async () => {
    await act(async () => {
      root.render(<AuditTab onNotify={onNotify} setLoading={setLoading} />);
      await Promise.resolve();
    });

    const input = container.querySelector('input[placeholder="Buscar por actor, recurso o ID auditoría"]') as HTMLInputElement;
    expect(input).toBeTruthy();

    await act(async () => {
      setInputValue(input, 'ab');
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });

    expect(mockGetAuditLogs).toHaveBeenCalledTimes(1);

    await act(async () => {
      setInputValue(input, 'usr_001');
      await Promise.resolve();
    });

    await act(async () => {
      vi.advanceTimersByTime(450);
      await Promise.resolve();
    });

    expect(mockGetAuditLogs).toHaveBeenCalledTimes(2);
    expect(mockGetAuditLogs).toHaveBeenLastCalledWith({ page: 1, limit: 50, search: 'usr_001' });
  });

  it('abre modal con detalle completo al hacer click en una fila', async () => {
    await act(async () => {
      root.render(<AuditTab onNotify={onNotify} setLoading={setLoading} />);
      await Promise.resolve();
    });

    const row = container.querySelector('tbody tr') as HTMLTableRowElement;
    expect(row).toBeTruthy();

    await act(async () => {
      row.click();
      await Promise.resolve();
    });

    expect(container.textContent).toContain('Detalle de auditoría');
    expect(container.textContent).toContain('Datos completos');
    expect(container.textContent).toContain('Authorization');
    expect(container.textContent).toContain('Request/Change');
    expect(container.textContent).toContain('Integrity');
  });
});
