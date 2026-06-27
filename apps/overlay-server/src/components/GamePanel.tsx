import { useEffect, useRef, useState } from 'react';

import type { MatchMetadata, SponsorEntry } from '../matchMetadata';
import { SearchSelect } from './data/SearchSelect';
import { SlideDrawer } from './data/SlideDrawer';
import { EmptyState, Feedback, Field, LoadingState, fieldClass, filterSelectClass, searchInputClass, primaryButtonClass, secondaryButtonClass, tableHeaderClass, tableCellClass, tableClass, tableBodyClass, tableHeadRowClass } from './data/shared';
import { normalizeSponsor, type Sponsor } from './data/types';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface GameSummary {
  id: string;
  label: string;
  status: string;
  gameName?: string;
  homeTeamId?: string;
  homeTeamName?: string;
  awayTeamId?: string;
  awayTeamName?: string;
  scheduledAt?: string;
  venue?: string;
  venueId?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: 'scheduled',        label: 'Programado' },
  { value: 'pre_game',         label: 'Pre-juego' },
  { value: 'live',             label: 'En juego' },
  { value: 'paused',           label: 'Pausado' },
  { value: 'between_innings',  label: 'Entre entradas' },
  { value: 'final',            label: 'Final' },
  { value: 'cancelled',        label: 'Cancelado' },
];

function statusBadge(status: string) {
  const map: Record<string, string> = {
    live:             'bg-emerald-400/15 text-emerald-300 border border-emerald-400/30',
    pre_game:         'bg-blue-400/15 text-blue-300 border border-blue-400/30',
    scheduled:        'bg-blue-400/15 text-blue-300 border border-blue-400/30',
    between_innings:  'bg-amber-400/15 text-amber-300 border border-amber-400/30',
    paused:           'bg-amber-400/15 text-amber-300 border border-amber-400/30',
    final:            'bg-white/10 text-white/40 border border-white/10',
    cancelled:        'bg-red-400/15 text-red-300 border border-red-400/30',
  };
  const label = STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
  return (
    <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${map[status] ?? 'bg-white/10 text-white/40'}`}>
      {label}
    </span>
  );
}

function formatDate(iso?: string) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

// ── SponsorPicker ─────────────────────────────────────────────────────────────

interface SponsorPickerProps {
  allSponsors: Sponsor[];
  assigned: SponsorEntry[];
  onChange: (next: SponsorEntry[]) => void;
}

function SponsorPicker({ allSponsors, assigned, onChange }: SponsorPickerProps) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const assignedIds = new Set(assigned.map((a) => a.sponsorId));
  const suggestions = allSponsors
    .filter((s) => !assignedIds.has(s.id) && (!query || s.name.toLowerCase().includes(query.toLowerCase()) || s.brand.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 8);

  function add(s: Sponsor) {
    onChange([...assigned, { sponsorId: s.id, displayName: s.name, logoAssetId: s.logoAssetId || undefined, priority: s.priority, active: true }]);
    setQuery('');
    inputRef.current?.focus();
  }

  if (allSponsors.length === 0) {
    return (
      <div>
        <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-1">Sponsors</span>
        <p className="text-[10px] text-white/30">Sin sponsors registrados. Créalos en el tab 🤝 Sponsors.</p>
      </div>
    );
  }

  return (
    <div>
      <span className="block text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2">Sponsors</span>
      {assigned.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {assigned.map((a) => (
            <span key={a.sponsorId} className="inline-flex items-center gap-1 rounded-full bg-mineros-gold/15 border border-mineros-gold/30 px-2.5 py-1 text-xs text-mineros-gold">
              {a.displayName}
              <button type="button" onClick={() => onChange(assigned.filter((x) => x.sponsorId !== a.sponsorId))} className="ml-0.5 text-mineros-gold/60 hover:text-mineros-gold transition leading-none" aria-label="Quitar">×</button>
            </span>
          ))}
        </div>
      )}
      <div className="relative">
        <input
          ref={inputRef}
          className={fieldClass}
          placeholder="Buscar y agregar sponsor…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
        {open && suggestions.length > 0 && (
          <ul className="absolute z-50 left-0 right-0 mt-1 rounded border border-zinc-700 bg-zinc-900 shadow-lg max-h-48 overflow-y-auto">
            {suggestions.map((s) => (
              <li key={s.id}>
                <button type="button" onMouseDown={() => add(s)} className="w-full text-left px-3 py-2 text-xs hover:bg-white/10 transition">
                  <span className="font-medium text-white/90">{s.name}</span>
                  {s.brand && <span className="ml-2 text-white/40">{s.brand}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query.length > 0 && suggestions.length === 0 && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white/40">
            <p>Sin resultados para «{query}»</p>
            <p className="mt-0.5 text-white/30">Para asignarlo, regístralo primero en el tab <span className="text-mineros-gold/70">🤝 Sponsors</span>.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Formulario vacío ──────────────────────────────────────────────────────────

function emptyForm(game?: GameSummary) {
  return {
    gameName:    game?.gameName    ?? '',
    venueId:     game?.venueId     ?? '',
    scheduledAt: game?.scheduledAt ? game.scheduledAt.slice(0, 10) : '',
    status:      game?.status      ?? 'scheduled',
    homeTeamId:  game?.homeTeamId  ?? '',
    awayTeamId:  game?.awayTeamId  ?? '',
    sponsors:    [] as SponsorEntry[],
  };
}

// ── Componente principal ──────────────────────────────────────────────────────

export function GamePanel({ currentGameId, embedded = false }: { currentGameId: string; embedded?: boolean }) {
  const [games, setGames]         = useState<GameSummary[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [message, setMessage]     = useState<string | null>(null);
  const [filterName, setFilterName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const [drawerOpen, setDrawerOpen]         = useState(false);
  const [editingId, setEditingId]           = useState<string | null>(null);
  const [form, setForm]                     = useState(emptyForm());
  const [allSponsors, setAllSponsors]       = useState<Sponsor[]>([]);
  const [allTeams, setAllTeams]             = useState<{ id: string; name: string; shortName: string }[]>([]);
  const [allVenues, setAllVenues]           = useState<{ id: string; name: string }[]>([]);
  const [saving, setSaving]                 = useState(false);
  const anchorRef = useRef<HTMLTableRowElement | null>(null);

  // Cargar partidos
  useEffect(() => {
    setLoading(true);
    fetch(`${API}/games?all=true`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: { games?: unknown[] } }>)
      .then((body) => {
        const list = body.result === 'ok' && Array.isArray(body.payload?.games) ? body.payload!.games! : [];
        setGames(list.map((g) => {
          const raw = g as Record<string, unknown>;
          const ht = raw.homeTeam as Record<string, unknown> | undefined;
          const at = raw.awayTeam as Record<string, unknown> | undefined;
          return {
            id:           String(raw.id ?? ''),
            label:        String(raw.label ?? raw.id ?? ''),
            status:       String(raw.status ?? 'scheduled'),
            gameName:     raw.gameName ? String(raw.gameName) : undefined,
            homeTeamId:   ht ? String(ht.id ?? '') : undefined,
            homeTeamName: ht ? String(ht.name ?? '') : undefined,
            awayTeamId:   at ? String(at.id ?? '') : undefined,
            awayTeamName: at ? String(at.name ?? '') : undefined,
            scheduledAt:  raw.scheduledAt ? String(raw.scheduledAt) : undefined,
            venue:        raw.venue       ? String(raw.venue)       : undefined,
          };
        }));
      })
      .catch(() => setError('No se pudo cargar la lista de partidos. Verifica la conexión al servidor.'))
      .finally(() => setLoading(false));
  }, []);

  // Cargar sponsors disponibles una vez
  useEffect(() => {
    fetch(`${API}/sponsors`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: unknown[] }>)
      .then((body) => {
        const list = body.result === 'ok' && Array.isArray(body.payload) ? body.payload : [];
        setAllSponsors(list.map(normalizeSponsor));
      })
      .catch(() => setAllSponsors([]));
  }, []);

  // Cargar equipos disponibles una vez
  useEffect(() => {
    fetch(`${API}/teams`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: unknown[] }>)
      .then((body) => {
        const list = body.result === 'ok' && Array.isArray(body.payload) ? body.payload : [];
        setAllTeams(list.map((t) => {
          const raw = t as Record<string, unknown>;
          return { id: String(raw.id ?? ''), name: String(raw.fullName ?? raw.name ?? ''), shortName: String(raw.shortName ?? '') };
        }));
      })
      .catch(() => setAllTeams([]));
  }, []);

  useEffect(() => {
    fetch(`${API}/venues`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: unknown[] }>)
      .then((body) => {
        const list = body.result === 'ok' && Array.isArray(body.payload) ? body.payload : [];
        setAllVenues(list.map((v) => {
          const raw = v as Record<string, unknown>;
          return { id: String(raw.id ?? ''), name: String(raw.name ?? '') };
        }));
      })
      .catch(() => setAllVenues([]));
  }, []);

  function openNew() {
    anchorRef.current = null;
    setEditingId(null);
    setError(null);
    setMessage(null);
    setForm(emptyForm());
    setDrawerOpen(true);
  }

  function openEdit(game: GameSummary, rowEl: HTMLTableRowElement) {
    anchorRef.current = rowEl;
    setEditingId(game.id);
    setError(null);
    setMessage(null);

    // Inicializar form sincrónicamente con los datos del juego
    const baseForm = emptyForm(game);
    if (!baseForm.venueId && game.venue) {
      baseForm.venueId = allVenues.find((venue) => venue.name === game.venue)?.id ?? '';
    }
    setForm(baseForm);
    setDrawerOpen(true);

    // Luego cargar los sponsors asignados (actualización asíncrona)
    void fetch(`${API}/games/${game.id}/metadata`)
      .then((r) => r.json() as Promise<{ result?: string; payload?: Partial<MatchMetadata> }>)
      .then((body) => {
        const meta = body.result === 'ok' ? body.payload : null;
        setForm((current) => ({ ...current, sponsors: meta?.sponsors ?? [] }));
      })
      .catch(() => { /* sponsors queda vacío, no es crítico */ });
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingId(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const homeTeam = allTeams.find((t) => t.id === form.homeTeamId);
    const awayTeam = allTeams.find((t) => t.id === form.awayTeamId);
    const selectedVenue = allVenues.find((venue) => venue.id === form.venueId);
    try {
      if (!editingId) {
        // ── CREAR ──────────────────────────────────────────────────────────
        const createRes = await fetch(`${API}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            gameName:    form.gameName    || null,
            venue_id:    form.venueId     || null,
            scheduledAt: form.scheduledAt || null,
            homeTeamId:  form.homeTeamId  || null,
            awayTeamId:  form.awayTeamId  || null,
            status:      form.status      || 'scheduled',
          }),
        });
        const createBody = await createRes.json() as { result?: string; payload?: { id?: string } };
        const newId = createBody.payload?.id;
        if (!newId) throw new Error('No se recibió ID del partido creado');

        setGames((prev) => [
          ...prev,
          {
            id:           newId,
            label:        form.gameName || `${homeTeam?.shortName ?? '?'} vs ${awayTeam?.shortName ?? '?'}`,
            gameName:     form.gameName || undefined,
            status:       form.status  || 'scheduled',
            venue:        selectedVenue?.name,
            venueId:      form.venueId || undefined,
            scheduledAt:  form.scheduledAt || undefined,
            homeTeamId:   form.homeTeamId  || undefined,
            homeTeamName: homeTeam?.name,
            awayTeamId:   form.awayTeamId  || undefined,
            awayTeamName: awayTeam?.name,
          },
        ]);
        setMessage('Partido creado.');
        closeDrawer();
        return;
      }

      // ── ACTUALIZAR ─────────────────────────────────────────────────────
      await fetch(`${API}/games/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameName:    form.gameName    || null,
          venue_id:    form.venueId     || null,
          scheduledAt: form.scheduledAt || null,
          homeTeamId:  form.homeTeamId  || null,
          awayTeamId:  form.awayTeamId  || null,
        }),
      });

      // Guardar sponsors en la metadata del partido
      const metaRes = await fetch(`${API}/games/${editingId}/metadata`);
      const metaBody = await metaRes.json() as { result?: string; payload?: Partial<MatchMetadata> };
      const current: MatchMetadata = (metaBody.result === 'ok' && metaBody.payload)
        ? (metaBody.payload as MatchMetadata)
        : { gameId: editingId, branding: { brandName: '', brandLogoAssetId: '' }, competition: { name: '', tournament: '', category: '' }, venue: { name: '' }, game: { gameType: '', remainingTime: '', configuredInnings: 7 }, sponsors: [] };

      await fetch(`${API}/games/${editingId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...current, sponsors: form.sponsors }),
      });

      setGames((prev) => prev.map((g) => g.id === editingId
        ? {
            ...g,
            gameName:     form.gameName    || undefined,
            venue:        selectedVenue?.name,
            venueId:      form.venueId     || undefined,
            scheduledAt:  form.scheduledAt || g.scheduledAt,
            homeTeamId:   form.homeTeamId  || g.homeTeamId,
            homeTeamName: homeTeam?.name   ?? g.homeTeamName,
            awayTeamId:   form.awayTeamId  || g.awayTeamId,
            awayTeamName: awayTeam?.name   ?? g.awayTeamName,
          }
        : g,
      ));
      setMessage('Partido actualizado.');
      closeDrawer();
    } catch {
      setError('No se pudo guardar. Verifica la conexión al servidor.');
    } finally {
      setSaving(false);
    }
  }

  const filtered = games.filter((g) => {
    const q = filterName.toLowerCase();
    if (q && !(g.gameName ?? g.label).toLowerCase().includes(q)) return false;
    if (filterStatus && g.status !== filterStatus) return false;
    return true;
  });

  if (loading) return <LoadingState />;

  return (
    <div className={`space-y-3 ${embedded ? '' : 'p-4'}`}>
      {error   && <Feedback tone="error"   message={error}   />}
      {message && <Feedback tone="success" message={message} />}

      {/* ── Header: título + búsqueda + filtro + nuevo ── */}
      <div className="flex items-center gap-3 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35 shrink-0">
          ⚾ Partidos
          {currentGameId && (
            <span className="ml-2 rounded bg-mineros-gold/15 border border-mineros-gold/30 px-1.5 py-0.5 text-mineros-gold normal-case font-normal">
              En vivo: {games.find((g) => g.id === currentGameId)?.gameName ?? games.find((g) => g.id === currentGameId)?.label ?? currentGameId}
            </span>
          )}
        </h3>
        <input
          className={searchInputClass}
          placeholder="Buscar partido…"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />
        <select
          className={filterSelectClass}
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
        >
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <button type="button" onClick={() => openNew()} className={primaryButtonClass}>+ Nuevo partido</button>
      </div>

      {/* ── Tabla ── */}
      {filtered.length === 0 ? (
        <EmptyState message={games.length === 0 ? 'No hay partidos registrados.' : 'Sin resultados para el filtro aplicado.'} />
      ) : (
        <div className="rounded border border-white/10 overflow-x-auto">
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Fecha</th>
                <th className={tableHeaderClass}>Sede</th>
                <th className={tableHeaderClass}>Local</th>
                <th className={tableHeaderClass}>Visitante</th>
                <th className={tableHeaderClass}>Estado</th>
              </tr>
            </thead>
            <tbody className={tableBodyClass}>
              {filtered.map((game) => (
                <tr
                  key={game.id}
                  className={`transition cursor-pointer hover:bg-white/[0.04] active:bg-white/[0.07] ${game.id === currentGameId ? 'bg-mineros-gold/[0.06] border-l-2 border-l-mineros-gold' : ''}`}
                  onClick={(e) => openEdit(game, e.currentTarget as HTMLTableRowElement)}
                >
                  <td className={tableCellClass}>
                    <p className="font-semibold text-white/90">{game.gameName ?? game.label}</p>
                    {game.gameName && <p className="text-[10px] text-white/35">{game.label}</p>}
                  </td>
                  <td className={`${tableCellClass} whitespace-nowrap text-white/50`}>{formatDate(game.scheduledAt)}</td>
                  <td className={`${tableCellClass} text-white/50`}>{game.venue ?? '—'}</td>
                  <td className={`${tableCellClass} text-white/70`}>{game.homeTeamName ?? '—'}</td>
                  <td className={`${tableCellClass} text-white/70`}>{game.awayTeamName ?? '—'}</td>
                  <td className={tableCellClass}>{statusBadge(game.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* SlideDrawer de edición */}
      <SlideDrawer
        open={drawerOpen}
        title={editingId ? 'Editar partido' : 'Nuevo partido'}
        onClose={closeDrawer}
        anchorRef={anchorRef}
      >
        <div className="space-y-4 p-1">
          <Field label="Nombre del partido">
            <input
              className={fieldClass}
              value={form.gameName}
              onChange={(e) => setForm((f) => ({ ...f, gameName: e.target.value }))}
              placeholder="Nombre personalizado (opcional)"
            />
            <p className="mt-1 text-[10px] text-white/30">Si se omite, se usa el nombre automático (Local vs Visitante)</p>
          </Field>

          <Field label="Sede">
            {allVenues.length > 0 ? (
              <SearchSelect
                options={[{ value: '', label: 'Sin sede' }, ...allVenues.map((v) => ({ value: v.id, label: v.name }))]}
                value={form.venueId}
                onChange={(v) => setForm((f) => ({ ...f, venueId: v }))}
                placeholder="Seleccionar estadio…"
              />
            ) : (
              <input
                className={fieldClass}
                value={form.venueId}
                onChange={(e) => setForm((f) => ({ ...f, venueId: e.target.value }))}
                placeholder="venue-id"
              />
            )}
          </Field>

          <Field label="Fecha">
            <input
              type="date"
              className={fieldClass}
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
            />
          </Field>

          <Field label="Estado">
            <SearchSelect
              options={STATUS_OPTIONS}
              value={form.status}
              onChange={(v) => setForm((f) => ({ ...f, status: v }))}
            />
          </Field>

          <Field label="Equipo local">
            <SearchSelect
              options={allTeams.map((t) => ({ value: t.id, label: t.name, sublabel: t.shortName }))}
              value={form.homeTeamId}
              onChange={(v) => setForm((f) => ({ ...f, homeTeamId: v }))}
              placeholder="Seleccionar equipo local…"
            />
          </Field>

          <Field label="Equipo visitante">
            <SearchSelect
              options={allTeams.map((t) => ({ value: t.id, label: t.name, sublabel: t.shortName }))}
              value={form.awayTeamId}
              onChange={(v) => setForm((f) => ({ ...f, awayTeamId: v }))}
              placeholder="Seleccionar equipo visitante…"
            />
          </Field>

          <SponsorPicker
            allSponsors={allSponsors}
            assigned={form.sponsors}
            onChange={(sponsors) => setForm((f) => ({ ...f, sponsors }))}
          />

          {error && <p className="rounded bg-red-900/30 border border-red-500/30 px-3 py-2 text-xs text-red-300">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => { void handleSave(); }}
              disabled={saving}
              className={primaryButtonClass}
            >
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={closeDrawer} className={secondaryButtonClass}>
              Cancelar
            </button>
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
}
