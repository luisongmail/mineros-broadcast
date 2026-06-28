import { useEffect, useMemo, useState } from 'react';

import { useOverlayServer } from '../hooks/useOverlayServer';
import { useAuth } from '../modules/auth/SecurityContextProvider';
import {
  OverlayServerClientError,
  clearPreview,
  forceShow,
  hideAll,
  previewOverlay as requestPreviewOverlay,
  takeOverlay,
} from '../services/overlayServerClient';
import {
  canForceShowForRole,
  getDefaultZoneIdForOverlay,
  toCanonicalOverlayId,
  toUiOverlayId,
  buildOverlaySnapshot,
  type OverlayConnectionStatus,
} from '../types/overlay';
import { ActionButton } from './ControlPanel/ActionButton';
import { OVERLAY_GROUPS, OVERLAY_TRIGGERS, type OverlayTrigger } from './ControlPanel/panelData';
import { StagePanel } from './ControlPanel/StagePanel';
import { StatusPill } from './ControlPanel/StatusPill';

interface ConflictResolutionState {
  overlayId: string;
  occupyingOverlayId: string | null;
  zoneId: string;
}

function findOverlayById(id: string | null): OverlayTrigger | null {
  if (!id) {
    return null;
  }

  const uiOverlayId = toUiOverlayId(id);
  return OVERLAY_TRIGGERS.find((overlay) => overlay.id === uiOverlayId) ?? null;
}

function toStatusLabel(status: OverlayConnectionStatus): string {
  switch (status) {
    case 'connected':
      return 'Conectado';
    case 'connecting':
      return 'Conectando';
    case 'error':
      return 'Error';
    case 'disconnected':
    default:
      return 'Desconectado';
  }
}

function toStatusTone(status: OverlayConnectionStatus): 'neutral' | 'success' | 'warning' {
  switch (status) {
    case 'connected':
      return 'success';
    case 'connecting':
      return 'neutral';
    case 'error':
    case 'disconnected':
    default:
      return 'warning';
  }
}

function getRoleLabel(role: string | null | undefined): string {
  if (!role) {
    return 'Sin rol';
  }

  return role.charAt(0).toUpperCase() + role.slice(1);
}

export function OperatorControlPanel() {
  const { user, currentScope, getAccessToken } = useAuth();
  const {
    connectionStatus,
    dispatch,
    latencyMs,
    previewState,
    programState,
    revision,
  } = useOverlayServer();

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [operatorError, setOperatorError] = useState<string | null>(null);
  const [conflictResolution, setConflictResolution] = useState<ConflictResolutionState | null>(null);

  const accessToken = getAccessToken();
  const operatorRole = currentScope?.role ?? user?.globalRoles[0] ?? 'operator';
  const operatorId = user?.userId ?? 'operator-demo';
  const isConnected = connectionStatus === 'connected';
  const allowForceShow = canForceShowForRole(operatorRole);

  const previewOverlayEntry = useMemo(() => findOverlayById(previewState?.overlayId ?? null), [previewState?.overlayId]);
  const programOverlay = useMemo(() => findOverlayById(programState?.overlayId ?? null), [programState?.overlayId]);

  const previewPanelState = conflictResolution ? 'error' : previewState ? 'ready' : 'empty';
  const programPanelState = programState ? 'live' : 'empty';

  useEffect(() => {
    if (conflictResolution && previewState?.overlayId === conflictResolution.overlayId) {
      setConflictResolution(null);
      setOperatorError(null);
    }
  }, [conflictResolution, previewState?.overlayId]);

  const previewSubtitle = conflictResolution
    ? operatorError ?? 'Preview bloqueado por conflicto de zona.'
    : previewState
      ? `${previewOverlayEntry?.name ?? previewState.overlayId} · zona ${previewState.zoneId} · revisión ${revision}`
      : 'Esperando overlay preparado desde Overlay Server';

  const programSubtitle = programState
    ? `${programOverlay?.name ?? programState.overlayId} · zona ${programState.zoneId} · revisión ${revision}`
    : 'Sin overlay transitorio en Program';

  const currentProgramLabel = programOverlay?.persistent
    ? 'Scorebug'
    : programOverlay?.name ?? (programState?.overlayId ? toUiOverlayId(programState.overlayId) : 'Sin overlay transitorio');

  async function runServerAction(actionId: string, callback: () => Promise<void>) {
    if (!isConnected || pendingAction) {
      return;
    }

    setPendingAction(actionId);
    setOperatorError(null);

    try {
      await callback();
    } catch (error) {
      if (error instanceof OverlayServerClientError) {
        if (error.serverSnapshot.snapshot) {
          dispatch({ type: 'sync-from-response', snapshot: error.serverSnapshot.snapshot });
        }

        if (error.status === 409) {
          const occupyingOverlayId = error.serverSnapshot.occupyingOverlayId;
          const message = occupyingOverlayId
            ? `Error 409 — zona ocupada por ${toUiOverlayId(occupyingOverlayId)}, desplazar?`
            : 'Error 409 — conflicto detectado en Overlay Server. Revisa el snapshot actual.';

          setOperatorError(message);
          return;
        }

        if (error.status === 423) {
          setOperatorError('Recurso bloqueado por otro operador o política activa.');
          return;
        }

        if (error.status === 403) {
          setOperatorError('No autorizado para ejecutar esta acción.');
          return;
        }

        setOperatorError(error.message);
        return;
      }

      setOperatorError('No fue posible comunicarse con Overlay Server.');
    } finally {
      setPendingAction(null);
    }
  }

  const handlePreview = async (overlay: OverlayTrigger) => {
    const overlayId = toCanonicalOverlayId(overlay.id);
    const zoneId = getDefaultZoneIdForOverlay(overlayId);

    await runServerAction(`trigger:${overlay.id}`, async () => {
      try {
        const response = await requestPreviewOverlay(overlayId, zoneId, {
          accessToken,
          expectedRevision: revision,
          operatorId,
          priority: overlay.persistent ? 90 : undefined,
          role: operatorRole,
        });
        const snapshot = buildOverlaySnapshot({
          revision: response.payload.revision,
          previewState: response.payload.previewState,
          programState: response.payload.programState,
          conflicts: response.payload.conflicts,
          latencyMs: response.payload.latencyMs,
          locks: response.payload.locks,
          connectionStatus: 'connected',
        });
        if (snapshot) {
          dispatch({ type: 'sync-from-response', snapshot });
        }
        setConflictResolution(null);
      } catch (error) {
        if (error instanceof OverlayServerClientError && error.status === 409) {
          setConflictResolution({
            overlayId,
            occupyingOverlayId: error.serverSnapshot.occupyingOverlayId,
            zoneId: error.serverSnapshot.zoneId ?? zoneId,
          });
        }
        throw error;
      }
    });
  };

  const handleTake = async () => {
    if (!previewState?.overlayId) {
      return;
    }

    await runServerAction('take', async () => {
      const response = await takeOverlay(previewState.overlayId, {
        accessToken,
        expectedRevision: revision,
        operatorId,
        role: operatorRole,
      });
      const snapshot = buildOverlaySnapshot({
        revision: response.payload.revision,
        previewState: response.payload.previewState,
        programState: response.payload.programState,
        conflicts: response.payload.conflicts,
        latencyMs: response.payload.latencyMs,
        locks: response.payload.locks,
        connectionStatus: 'connected',
      });
      if (snapshot) {
        dispatch({ type: 'sync-from-response', snapshot });
      }
      setConflictResolution(null);
    });
  };

  const handleHideAll = async () => {
    await runServerAction('hide-all', async () => {
      const response = await hideAll({
        accessToken,
        expectedRevision: revision,
        operatorId,
        role: operatorRole,
      });
      const snapshot = buildOverlaySnapshot({
        revision: response.payload.revision,
        previewState: response.payload.previewState,
        programState: response.payload.programState,
        conflicts: response.payload.conflicts,
        latencyMs: response.payload.latencyMs,
        locks: response.payload.locks,
        connectionStatus: 'connected',
      });
      if (snapshot) {
        dispatch({ type: 'sync-from-response', snapshot });
      }
      setConflictResolution(null);
    });
  };

  const handleClearPreview = async () => {
    await runServerAction('clear-preview', async () => {
      const response = await clearPreview({
        accessToken,
        expectedRevision: revision,
        operatorId,
        role: operatorRole,
      });
      const snapshot = buildOverlaySnapshot({
        revision: response.payload.revision,
        previewState: response.payload.previewState,
        programState: response.payload.programState,
        conflicts: response.payload.conflicts,
        latencyMs: response.payload.latencyMs,
        locks: response.payload.locks,
        connectionStatus: 'connected',
      });
      if (snapshot) {
        dispatch({ type: 'sync-from-response', snapshot });
      }
      setConflictResolution(null);
    });
  };

  const handleForceShow = async () => {
    if (!conflictResolution || !allowForceShow) {
      return;
    }

    await runServerAction('force-show', async () => {
      const response = await forceShow(conflictResolution.overlayId, conflictResolution.zoneId, {
        accessToken,
        expectedRevision: revision,
        operatorId,
        overridePolicy: 'manual_override',
        reason: 'force_show_desde_conflicto',
        role: operatorRole,
      });
      const snapshot = buildOverlaySnapshot({
        revision: response.payload.revision,
        previewState: response.payload.previewState,
        programState: response.payload.programState,
        conflicts: response.payload.conflicts,
        latencyMs: response.payload.latencyMs,
        locks: response.payload.locks,
        connectionStatus: 'connected',
      });
      if (snapshot) {
        dispatch({ type: 'sync-from-response', snapshot });
      }
      setConflictResolution(null);
      setOperatorError(null);
    });
  };

  return (
    <div className="min-h-screen bg-broadcast-black font-inter text-white">
      <div className="mx-auto flex min-h-screen max-w-[1600px] flex-col gap-6 px-4 py-6 lg:px-6">
        <header className="rounded-xl border border-white/10 bg-mineros-navy/80 p-5 shadow-broadcast">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <p className="font-bebas text-4xl uppercase tracking-[0.28em] text-mineros-gold">Operator Control Panel</p>
              <p className="mt-1 max-w-3xl text-sm text-white/70">
                Preview obligatorio, snapshot WS autoritativo y control REST IC-003 para overlays de transmisión.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label="Conexión" value={toStatusLabel(connectionStatus)} tone={toStatusTone(connectionStatus)} />
              <StatusPill label="Rol" value={getRoleLabel(operatorRole)} />
              <StatusPill label="Revisión" value={String(revision)} />
            </div>
          </div>
        </header>

        {operatorError && (
          <section data-testid="control-error-banner" className="rounded-xl border border-mineros-red/35 bg-mineros-red/10 p-4 shadow-broadcast">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-200">Conflicto operativo</p>
                <p className="mt-1 text-sm text-red-100/85">{operatorError}</p>
                <p className="mt-1 text-xs text-red-100/70">Snapshot actualizado · revisión {revision}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {conflictResolution && allowForceShow && (
                  <ActionButton
                    label="Desplazar"
                    tone="primary"
                    state={pendingAction === 'force-show' ? 'loading' : (!isConnected ? 'disabled' : 'enabled')}
                    onClick={() => { void handleForceShow(); }}
                  />
                )}
                <ActionButton
                  label="Cerrar"
                  state={pendingAction ? 'disabled' : 'enabled'}
                  onClick={() => {
                    setConflictResolution(null);
                    setOperatorError(null);
                  }}
                />
              </div>
            </div>
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-2">
          <div data-testid="preview-canvas">
            <StagePanel title="Preview" subtitle={previewSubtitle} variant="preview" state={previewPanelState}>
            <div className="flex h-full flex-col justify-between gap-4">
              {previewState && previewOverlayEntry && (
                <div className="flex flex-wrap gap-2 text-[11px] text-white/55">
                  <span className="rounded-full border border-mineros-gold/30 px-3 py-1">Zona {previewState.zoneId}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Estado {previewState.state}</span>
                  <span className="rounded-full border border-white/10 px-3 py-1">Revisión {revision}</span>
                </div>
              )}

              {!previewState && (
                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-white/15 bg-white/[0.03]">
                  <div className="text-center">
                    <p className="font-bebas text-3xl uppercase tracking-[0.22em] text-white/65">Preview vacío</p>
                    <p className="mt-2 text-sm text-white/45">Selecciona un trigger y espera el snapshot autoritativo del servidor.</p>
                  </div>
                </div>
              )}

              {previewState && previewOverlayEntry && (
                <div className="grid flex-1 place-items-center">
                  <div className="w-full max-w-md rounded-xl border border-mineros-gold/35 bg-broadcast-black/70 p-5 shadow-broadcast">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-mineros-gold/75">{previewOverlayEntry.category}</p>
                    <p className="mt-2 font-bebas text-4xl uppercase tracking-[0.2em] text-mineros-gold">{previewOverlayEntry.name}</p>
                    <p className="mt-3 text-sm text-white/70">{previewOverlayEntry.description}</p>
                    <div className="mt-5 flex flex-wrap gap-2 text-[11px] text-white/55">
                      <span className="rounded-full border border-white/10 px-3 py-1">1920×1080</span>
                      <span className="rounded-full border border-white/10 px-3 py-1">Grid 24×12</span>
                      <span className="rounded-full border border-white/10 px-3 py-1">Safe Area 60px</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            </StagePanel>
          </div>

          <div data-testid="program-canvas">
            <StagePanel title="Program" subtitle={programSubtitle} variant="program" state={programPanelState}>
            <div className="flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Salida al aire</p>
                  <p className="mt-2 font-bebas text-4xl uppercase tracking-[0.22em] text-white">{currentProgramLabel}</p>
                </div>
                {programState && (
                  <span className="rounded-[4px] border border-mineros-red bg-mineros-red px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
                    Live
                  </span>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Persistente</p>
                  <p className="mt-2 font-bebas text-2xl uppercase tracking-[0.18em] text-mineros-gold">Scorebug</p>
                  <p className="mt-2 text-sm text-white/65">Hide All sólo oculta overlays no persistentes según snapshot del servidor.</p>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Overlay activo</p>
                  <p className="mt-2 font-bebas text-2xl uppercase tracking-[0.18em] text-white">
                    {programOverlay?.persistent ? 'Sin overlay transitorio' : programOverlay?.name ?? 'Sin overlay transitorio'}
                  </p>
                  <p className="mt-2 text-sm text-white/65">
                    {programState
                      ? `Zona ${programState.zoneId} · estado ${programState.state}`
                      : 'Program espera el siguiente Take desde Preview.'}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
                <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Lista de overlays activos</p>
                <div className="mt-3 flex flex-wrap gap-2" data-testid="program-active-overlays">
                  <span className="rounded-full border border-mineros-gold/40 bg-mineros-gold/15 px-3 py-1 text-xs font-semibold text-mineros-gold">
                    Scorebug
                  </span>
                  {!programOverlay?.persistent && programOverlay && (
                    <span className="rounded-full border border-mineros-red/40 bg-mineros-red/15 px-3 py-1 text-xs font-semibold text-red-100">
                      {programOverlay.name}
                    </span>
                  )}
                </div>
              </div>
            </div>
            </StagePanel>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-broadcast">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              <ActionButton
                label="Take"
                tone="primary"
                state={pendingAction === 'take' ? 'loading' : (!previewState || !isConnected ? 'disabled' : 'enabled')}
                onClick={() => { void handleTake(); }}
              />
              <ActionButton
                label="Hide All"
                tone="danger"
                state={pendingAction === 'hide-all' ? 'loading' : (!isConnected ? 'disabled' : 'enabled')}
                onClick={() => { void handleHideAll(); }}
              />
              <ActionButton
                label="Clear Preview"
                state={pendingAction === 'clear-preview' ? 'loading' : (!isConnected ? 'disabled' : 'enabled')}
                onClick={() => { void handleClearPreview(); }}
              />
            </div>

            <div className="rounded-lg border border-white/10 bg-broadcast-black/50 px-4 py-3">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/45">Estado operativo</p>
              <p className="mt-1 text-sm text-white/70">
                Botones bloqueados mientras la conexión WS no esté establecida o haya una acción en curso.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.03] p-4 shadow-broadcast">
          <div className="mb-4 flex flex-col gap-1">
            <p className="font-bebas text-2xl uppercase tracking-[0.22em] text-mineros-gold">Overlay Triggers</p>
            <p className="text-sm text-white/65">Cada trigger dispara Preview por REST y espera confirmación autoritativa vía WebSocket.</p>
          </div>

          <div className="space-y-5">
            {OVERLAY_GROUPS.map(([category, overlays]) => (
              <div key={category}>
                <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/45">{category}</p>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {overlays.map((overlay) => {
                    const canonicalId = toCanonicalOverlayId(overlay.id);
                    const isSelected = previewState?.overlayId === canonicalId;
                    const isLoading = pendingAction === `trigger:${overlay.id}`;

                    return (
                      <button
                        key={overlay.id}
                        type="button"
                        disabled={!isConnected || Boolean(pendingAction)}
                        onClick={() => { void handlePreview(overlay); }}
                        className={`rounded-xl border p-4 text-left shadow-broadcast transition ${
                          isSelected
                            ? 'border-mineros-gold/50 bg-mineros-gold/12'
                            : 'border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.07]'
                        } ${
                          !isConnected || Boolean(pendingAction) ? 'cursor-not-allowed opacity-60' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-bebas text-2xl uppercase tracking-[0.18em] text-white">{overlay.name}</p>
                            <p className="mt-2 text-sm text-white/60">{overlay.description}</p>
                          </div>
                          {overlay.persistent && (
                            <span className="rounded-full border border-mineros-gold/35 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-mineros-gold">
                              Lock
                            </span>
                          )}
                        </div>
                        <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-[0.16em] text-white/45">
                          <span>{overlay.category}</span>
                          <span>{isLoading ? 'Enviando' : isSelected ? 'Preview' : 'Listo'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className="mt-auto rounded-xl border border-white/10 bg-mineros-navy/40 px-4 py-3 shadow-broadcast">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <StatusPill label="Conexión" value={toStatusLabel(connectionStatus)} tone={toStatusTone(connectionStatus)} />
              <StatusPill label="Latencia" value={`${latencyMs} ms`} />
              <StatusPill label="Programa actual" value={currentProgramLabel} />
            </div>
            <div className="min-w-[240px]">
              <p className="text-xs text-white/50">Preview → Take → Live. El snapshot WS manda y los conflictos se resuelven con revisión monotónica.</p>
              <div className="mt-2">
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-white/45">
                  <span>Latencia WS</span>
                  <span>{latencyMs} ms</span>
                </div>
                <div
                  aria-label="Latencia WebSocket"
                  aria-valuemax={100}
                  aria-valuemin={0}
                  aria-valuenow={latencyMs}
                  className="h-2 overflow-hidden rounded-full bg-white/10"
                  data-testid="ws-latency-bar"
                  role="progressbar"
                >
                  <div
                    className="h-full rounded-full bg-mineros-gold transition-all duration-300"
                    style={{ width: `${Math.min(100, latencyMs)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
