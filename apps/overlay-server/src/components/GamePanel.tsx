import { useCallback, useEffect, useRef, useState } from 'react';

import type { MatchMetadata, SponsorEntry } from '../matchMetadata';
import { normalizeSponsor, type Sponsor } from './data/types';
import { SlideDrawer } from './data/SlideDrawer';
import { MatchMetadataEditor } from './MatchMetadataEditor';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── Tipos ────────────────────────────────────────────────────────────────────

interface GameSummary {
  id: string;
  label: string;
  status: string;
  gameName?: string;
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

  // Drawer para editar nombre / venue / sponsors del partido
  const [editGameId, setEditGameId] = useState<string | null>(null);
  const [editGameName, setEditGameName] = useState('');
  const [editVenue, setEditVenue] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const editAnchorRef = useRef<HTMLElement | null>(null);

  // Sponsors: lista global + asignados al partido en edición
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);
  const [assignedSponsors, setAssignedSponsors] = useState<SponsorEntry[]>([]);

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
                gameName: raw.gameName ? String(raw.gameName) : undefined,
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

  const openEditGame = useCallback((g: GameSummary, rowEl: HTMLElement) => {
    setEditGameId(g.id);
    setEditGameName(g.gameName ?? '');
    setEditVenue(g.venue ?? '');
    setEditSaved(false);
    setAssignedSponsors([]);
    editAnchorRef.current = rowEl;

    // Cargar sponsors disponibles y los ya asignados al partido
    void fetch(`${API}/sponsors`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: unknown[] }>)
      .then((body) => {
        const list = body.result === 'ok' && Array.isArray(body.payload) ? body.payload : [];
        setAllSponsors(list.map(normalizeSponsor));
      })
      .catch(() => setAllSponsors([]));

    void fetch(`${API}/games/${g.id}/metadata`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: Partial<MatchMetadata> }>)
      .then((body) => {
        const meta = body.result === 'ok' ? body.payload : null;
        setAssignedSponsors(meta?.sponsors ?? []);
      })
      .catch(() => setAssignedSponsors([]));
  }, []);

  function toggleSponsor(s: Sponsor) {
    setAssignedSponsors((prev) => {
      const already = prev.some((a) => a.sponsorId === s.id);
      if (already) return prev.filter((a) => a.sponsorId !== s.id);
      return [...prev, { sponsorId: s.id, displayName: s.name, logoAssetId: s.logoAssetId || undefined, priority: s.priority, active: true }];
    });
  }

  const saveGameEdit = useCallback(async () => {
    if (!editGameId) return;
    setEditSaving(true);
    try {
      // Guardar nombre y venue
      await fetch(`${API}/games/${editGameId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameName: editGameName || null, venue: editVenue || null }),
      });

      // Guardar sponsors asignados en la metadata del partido
      const metaRes = await fetch(`${API}/games/${editGameId}/metadata`);
      const metaBody = await metaRes.json() as { result?: string; payload?: Partial<MatchMetadata> };
      const current: MatchMetadata = (metaBody.result === 'ok' && metaBody.payload)
        ? (metaBody.payload as MatchMetadata)
        : { gameId: editGameId, branding: { brandName: '', brandLogoAssetId: '' }, competition: { name: '', tournament: '', category: '' }, venue: { name: '' }, game: { gameType: '', remainingTime: '', configuredInnings: 7 }, sponsors: [] };

      await fetch(`${API}/games/${editGameId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, sponsors: assignedSponsors }),
      });

      setGames((prev) => prev.map((g) => g.id === editGameId
        ? { ...g, gameName: editGameName || undefined, venue: editVenue || undefined, label: editGameName || g.label }
        : g,
      ));
      setEditSaved(true);
      setTimeout(() => { setEditSaved(false); setEditGameId(null); }, 1200);
    } catch { /* ignore */ } finally {
      setEditSaving(false);
    }
  }, [editGameId, editGameName, editVenue, assignedSponsors]);

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
      <div className="w-64 shrink-0 border-r border-white/10 flex flex-col">
        <p className="px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-white/35 border-b border-white/10 shrink-0">
          {loadingGames ? 'Cargando...' : `${games.length} partido${games.length !== 1 ? 's' : ''}`}
        </p>
        <div className="flex-1 overflow-y-auto">
          {games.map((g) => (
            <div
              key={g.id}
              className={`group flex items-start gap-0 border-b border-white/5 transition ${
                selectedId === g.id
                  ? 'bg-mineros-gold/15 border-l-2 border-l-mineros-gold'
                  : 'hover:bg-white/5'
              }`}
            >
              <button
                type="button"
                onClick={() => setSelectedId(g.id)}
                className="flex-1 text-left px-3 py-2.5 min-w-0"
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className={`text-xs font-semibold truncate ${selectedId === g.id ? 'text-mineros-gold' : 'text-white/90'}`}>
                    {g.gameName ?? g.label}
                  </p>
                  {statusBadge(g.status)}
                </div>
                {!g.gameName && <p className="text-[10px] text-white/35 truncate">{g.label}</p>}
                {g.venue && <p className="text-[10px] text-white/35 truncate">{g.venue}</p>}
              </button>
              {/* Botón editar nombre */}
              <button
                type="button"
                title="Editar nombre y sede"
                onClick={(e) => openEditGame(g, (e.currentTarget.closest('div[class*=group]') as HTMLElement) ?? e.currentTarget)}
                className="shrink-0 px-2 py-2.5 text-white/25 hover:text-mineros-gold opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ✏️
              </button>
            </div>
          ))}
          {!loadingGames && games.length === 0 && (
            <p className="px-3 py-4 text-xs text-white/35">Sin partidos disponibles.</p>
          )}
        </div>
      </div>

      {/* Drawer de edición del nombre del partido */}
      <SlideDrawer
        open={editGameId !== null}
        title="Editar partido"
        onClose={() => setEditGameId(null)}
        anchorRef={editAnchorRef}
      >
        <div className="space-y-4 p-1">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Nombre del partido</span>
            <input
              className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              value={editGameName}
              onChange={(e) => setEditGameName(e.target.value)}
              placeholder="Nombre personalizado (opcional)"
            />
            <span className="text-[10px] text-white/30">Si se omite, se usa el nombre automático</span>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Sede</span>
            <input
              className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              value={editVenue}
              onChange={(e) => setEditVenue(e.target.value)}
              placeholder="Estadio Mineros"
            />
          </label>

          {/* Sponsors del partido */}
          <div>
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">
              Sponsors asignados
            </span>
            {allSponsors.length === 0 ? (
              <p className="text-[10px] text-white/30">Sin sponsors registrados. Créalos en el tab 🤝 Sponsors.</p>
            ) : (
              <div className="grid grid-cols-1 gap-1.5">
                {allSponsors.map((s) => {
                  const on = assignedSponsors.some((a) => a.sponsorId === s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleSponsor(s)}
                      className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-xs transition ${
                        on
                          ? 'border-mineros-gold bg-mineros-gold/10 text-mineros-gold'
                          : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'
                      }`}
                    >
                      <span>{on ? '✅' : '☐'}</span>
                      <span>
                        <span className="font-semibold">{s.name}</span>
                        {s.brand && <span className="ml-1.5 opacity-50 text-[10px]">{s.brand}</span>}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { void saveGameEdit(); }}
              disabled={editSaving}
              className="rounded bg-mineros-gold px-4 py-1.5 text-sm font-semibold text-black hover:bg-mineros-gold/80 disabled:opacity-50 transition"
            >
              {editSaved ? '✅ Guardado' : editSaving ? 'Guardando…' : 'Guardar'}
            </button>
            <button
              type="button"
              onClick={() => setEditGameId(null)}
              className="rounded border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </SlideDrawer>

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
