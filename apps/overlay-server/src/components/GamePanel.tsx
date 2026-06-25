import { useCallback, useEffect, useState } from 'react';

import type { MatchMetadata } from '../matchMetadata';
import { MatchMetadataEditor } from './MatchMetadataEditor';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface GameSummary {
  id: string;
  label: string;
  status: string;
  homeTeam?: string;
  awayTeam?: string;
  scheduledAt?: string;
  venue?: string;
}

// ── Broadcast Defaults ────────────────────────────────────────────────────────
// Se guardan en localStorage para no tener que reconfigurar en cada sesión

const DEFAULTS_KEY = 'mb_broadcast_defaults';

interface BroadcastDefaults {
  brandName: string;
  brandLogoAssetId: string;
  defaultVenue: string;
  defaultCompetition: string;
}

function loadDefaults(): BroadcastDefaults {
  try {
    const raw = localStorage.getItem(DEFAULTS_KEY);
    if (raw) return JSON.parse(raw) as BroadcastDefaults;
  } catch { /* ignore */ }
  return { brandName: 'Mineros Broadcast', brandLogoAssetId: 'brands/mineros-broadcast-logo', defaultVenue: '', defaultCompetition: '' };
}

function saveDefaults(d: BroadcastDefaults) {
  localStorage.setItem(DEFAULTS_KEY, JSON.stringify(d));
}

// ── Componente ────────────────────────────────────────────────────────────────

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active:     'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
    in_progress:'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
    scheduled:  'bg-blue-400/15 text-blue-300 border border-blue-400/30',
    finished:   'bg-white/10 text-white/40 border border-white/10',
  };
  const label: Record<string, string> = { active: 'En juego', in_progress: 'En juego', scheduled: 'Prog.', finished: 'Finalizado' };
  const cls = map[status] ?? 'bg-white/10 text-white/40 border border-white/10';
  return <span className={`inline-flex items-center rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${cls}`}>{label[status] ?? status}</span>;
}

function fieldCls() {
  return 'block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none';
}

export function GamePanel({ currentGameId }: { currentGameId: string }) {
  const [games, setGames] = useState<GameSummary[]>([]);
  const [loadingGames, setLoadingGames] = useState(true);
  const [selectedId, setSelectedId] = useState<string>(currentGameId);
  const [defaults, setDefaults] = useState<BroadcastDefaults>(loadDefaults);
  const [defaultsSaved, setDefaultsSaved] = useState(false);

  // Cargar lista de juegos
  useEffect(() => {
    setLoadingGames(true);
    fetch(`${API}/games`)
      .then((r) => r.json())
      .then((body: unknown) => {
        if (body && typeof body === 'object' && 'result' in body) {
          const env = body as { result: string; payload?: { games?: unknown[] } };
          if (env.result === 'ok' && Array.isArray(env.payload?.games)) {
            setGames(env.payload.games.map((g) => {
              const raw = g as Record<string, unknown>;
              return {
                id: String(raw.id ?? ''),
                label: String(raw.label ?? raw.id ?? ''),
                status: String(raw.status ?? 'scheduled'),
                homeTeam: raw.homeTeam ? String(raw.homeTeam) : undefined,
                awayTeam: raw.awayTeam ? String(raw.awayTeam) : undefined,
                scheduledAt: raw.scheduledAt ? String(raw.scheduledAt) : undefined,
                venue: raw.venue ? String(raw.venue) : undefined,
              };
            }));
          }
        }
      })
      .catch(() => { /* servidor no disponible */ })
      .finally(() => setLoadingGames(false));
  }, []);

  // Sincronizar selected con currentGameId
  useEffect(() => {
    if (currentGameId) setSelectedId(currentGameId);
  }, [currentGameId]);

  const handleSaveDefaults = useCallback(() => {
    saveDefaults(defaults);
    setDefaultsSaved(true);
    setTimeout(() => setDefaultsSaved(false), 2000);
  }, [defaults]);

  const applyDefaultsToMetadata = useCallback(async () => {
    if (!selectedId) return;
    try {
      const res = await fetch(`${API}/games/${selectedId}/metadata`);
      const body = await res.json() as { result: string; payload?: Partial<MatchMetadata> };
      const current: MatchMetadata = body.result === 'ok' && body.payload
        ? (body.payload as MatchMetadata)
        : { gameId: selectedId, branding: { brandName: '', brandLogoAssetId: '' }, competition: { name: '', tournament: '', category: '' }, venue: { name: '' }, game: { gameType: '', remainingTime: '', configuredInnings: 7 }, sponsors: [] };

      const updated: MatchMetadata = {
        ...current,
        branding: { brandName: defaults.brandName, brandLogoAssetId: defaults.brandLogoAssetId },
        venue: { name: defaults.defaultVenue || current.venue?.name || '' },
        competition: { ...current.competition, name: defaults.defaultCompetition || current.competition?.name || '' },
      };

      await fetch(`${API}/games/${selectedId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
    } catch { /* ignore */ }
  }, [selectedId, defaults]);

  return (
    <div className="flex h-full gap-0 min-h-0">
      {/* ── Lista de partidos ── */}
      <div className="w-60 shrink-0 border-r border-white/10 flex flex-col">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35 border-b border-white/10 shrink-0">
          {loadingGames ? 'Cargando...' : `${games.length} partido${games.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex-1 overflow-y-auto">
          {games.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setSelectedId(g.id)}
              className={`w-full text-left px-3 py-2.5 border-b border-white/5 transition ${
                selectedId === g.id
                  ? 'bg-mineros-gold/15 border-l-2 border-l-mineros-gold'
                  : 'hover:bg-white/5'
              }`}
            >
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <p className={`text-xs font-semibold truncate ${selectedId === g.id ? 'text-mineros-gold' : 'text-white/90'}`}>
                  {g.label}
                </p>
                {statusBadge(g.status)}
              </div>
              {g.venue && <p className="text-[10px] text-white/35 truncate">{g.venue}</p>}
            </button>
          ))}
          {!loadingGames && games.length === 0 && (
            <p className="px-3 py-4 text-xs text-white/35">Sin partidos disponibles.</p>
          )}
        </div>
      </div>

      {/* ── Panel derecho: defaults + metadata del partido ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 min-w-0">

        {/* Defaults de broadcast */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35">
              ⚙️ Defaults del broadcast
            </h3>
            <p className="text-[10px] text-white/30">Se aplican a nuevos partidos automáticamente</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 rounded border border-white/10 bg-white/5 p-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Marca del broadcast</span>
              <input className={fieldCls()} value={defaults.brandName} onChange={(e) => setDefaults((d) => ({ ...d, brandName: e.target.value }))} placeholder="Mineros Broadcast" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Logo asset ID</span>
              <input className={fieldCls()} value={defaults.brandLogoAssetId} onChange={(e) => setDefaults((d) => ({ ...d, brandLogoAssetId: e.target.value }))} placeholder="brands/mineros-broadcast-logo" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Sede por defecto</span>
              <input className={fieldCls()} value={defaults.defaultVenue} onChange={(e) => setDefaults((d) => ({ ...d, defaultVenue: e.target.value }))} placeholder="Estadio Mineros" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Competencia por defecto</span>
              <input className={fieldCls()} value={defaults.defaultCompetition} onChange={(e) => setDefaults((d) => ({ ...d, defaultCompetition: e.target.value }))} placeholder="Liga Nacional de Béisbol" />
            </label>
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={handleSaveDefaults}
              className="rounded bg-mineros-navy border border-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/10 transition"
            >
              {defaultsSaved ? '✅ Guardado' : 'Guardar defaults'}
            </button>
            {selectedId && (
              <button
                type="button"
                onClick={() => { void applyDefaultsToMetadata(); }}
                className="rounded border border-mineros-gold/40 bg-mineros-gold/10 px-3 py-1.5 text-xs font-semibold text-mineros-gold hover:bg-mineros-gold/20 transition"
              >
                Aplicar al partido seleccionado →
              </button>
            )}
          </div>
        </section>

        {/* Metadata del partido seleccionado */}
        {selectedId && (
          <section>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/35">
              ⚾ Datos del partido
            </h3>
            <MatchMetadataEditor gameId={selectedId} />
          </section>
        )}

        {!selectedId && (
          <p className="text-sm text-white/30">Selecciona un partido de la lista para configurar sus datos.</p>
        )}
      </div>
    </div>
  );
}
