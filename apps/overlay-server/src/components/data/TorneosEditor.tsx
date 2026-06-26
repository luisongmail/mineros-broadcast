import { useEffect, useRef, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockCategories, mockLeagues, mockTournaments } from './mockData';
import { SearchSelect } from './SearchSelect';
import { SlideDrawer } from './SlideDrawer';
import {
  ConfirmDialog,
  dangerButtonClass,
  EmptyState,
  Feedback,
  Field,
  fieldClass,
  LoadingState,
  primaryButtonClass,
  secondaryButtonClass,
  tableBodyClass,
  tableClass,
  tableHeadRowClass,
  tableHeaderClass,
  tableRowClass,
  tableCellClass,
  type DialogState,
} from './shared';
import { normalizeCategory, normalizeLeague, normalizeTeam, normalizeTournament, type Category, type League, type Team, type Tournament, type TournamentStanding } from './types';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

const emptyTournament = (): Tournament => ({
  id: '', name: '', shortName: '', type: 'league', season: '',
  leagueId: '', categoryId: '',
  structureType: 'round_robin', roundRobinRounds: 1, hasPlayoffs: false,
  playoffFormat: '', startDate: '', endDate: '', status: 'upcoming',
  groups: [], standings: [],
});

const statusLabel: Record<Tournament['status'], string> = {
  upcoming: 'Por jugar',
  active: 'En curso',
  finished: 'Finalizado',
};
const statusColor: Record<Tournament['status'], string> = {
  upcoming: 'bg-white/10 text-white/50',
  active: 'bg-emerald-400/15 text-emerald-300',
  finished: 'bg-white/5 text-white/30',
};

export function TorneosEditor() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [leagues, setLeagues]         = useState<League[]>([]);
  const [categories, setCategories]   = useState<Category[]>([]);
  const [teams, setTeams]             = useState<Team[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [message, setMessage]         = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen]   = useState(false);
  const [form, setForm]               = useState<Tournament>(emptyTournament());
  const [saving, setSaving]           = useState(false);
  const [saved, setSaved]             = useState(false);
  const [dialog, setDialog]           = useState<DialogState | null>(null);
  const [standingsModalOpen, setStandingsModalOpen] = useState(false);
  const [filterLeague, setFilterLeague] = useState('');
  const editingId                     = useRef<string | null>(null);
  const anchorRef                     = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      request<{ tournaments?: unknown[] }>(`${API}/tournaments`).catch(() => ({ tournaments: [] as unknown[] })),
      request<{ leagues?: unknown[] }>(`${API}/leagues`).catch(() => ({ leagues: [] as unknown[] })),
      request<{ categories?: unknown[] }>(`${API}/categories`).catch(() => ({ categories: [] as unknown[] })),
      request<{ teams?: unknown[] }>(`${API}/teams`).catch(() => ({ teams: [] as unknown[] })),
    ]).then(([t, l, c, tm]) => {
      const raw = (t.tournaments ?? []).map(normalizeTournament);
      setTournaments(raw.length > 0 ? raw : mockTournaments);
      const rl = (l.leagues ?? []).map(normalizeLeague);
      setLeagues(rl.length > 0 ? rl : mockLeagues);
      const rc = (c.categories ?? []).map(normalizeCategory);
      setCategories(rc.length > 0 ? rc : mockCategories);
      setTeams((tm.teams ?? []).map(normalizeTeam));
    }).finally(() => setLoading(false));
  }, []);

  const leagueMap  = new Map(leagues.map((l) => [l.id, l.name]));
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const teamMap     = new Map(teams.map((t) => [t.id, t.fullName]));

  const filtered = filterLeague
    ? tournaments.filter((t) => t.leagueId === filterLeague)
    : tournaments;

  function openNew() {
    editingId.current = null;
    anchorRef.current = null;
    setStandingsModalOpen(false);
    setForm(emptyTournament());
    setError(null);
    setSaved(false);
    setDrawerOpen(true);
  }

  function openEdit(t: Tournament, row: HTMLTableRowElement) {
    editingId.current = t.id;
    anchorRef.current = row;
    setStandingsModalOpen(false);
    setForm({ ...t });
    setError(null);
    setSaved(false);
    setDrawerOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const isNew = !editingId.current;
      const payload = {
        id: isNew ? generateId(form.name) : form.id,
        name: form.name,
        short_name: form.shortName,
        type: form.type,
        season: form.season,
        league_id: form.leagueId || null,
        category_id: form.categoryId || null,
        structure_type: form.structureType,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
        status: form.status,
        has_playoffs: form.hasPlayoffs,
        playoff_format: form.playoffFormat || null,
        round_robin_rounds: form.roundRobinRounds,
      };
      if (isNew) {
        const res = await request<unknown>(`${API}/tournaments`, {
          method: 'POST', body: JSON.stringify(payload),
        });
        const tournament = normalizeTournament(
          res && typeof res === 'object' && 'tournament' in res
            ? (res as { tournament?: unknown }).tournament
            : res ?? payload,
        );
        setTournaments((prev) => [...prev, tournament]);
        editingId.current = payload.id;
      } else {
        const res = await request<unknown>(`${API}/tournaments/${payload.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        });
        const tournament = normalizeTournament(
          res && typeof res === 'object' && 'tournament' in res
            ? (res as { tournament?: unknown }).tournament
            : res ?? payload,
        );
        setTournaments((prev) => prev.map((t) => t.id === payload.id ? tournament : t));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setMessage(isNew ? 'Torneo creado.' : 'Torneo actualizado.');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError(toErrorMessage(e, "Error inesperado."));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(t: Tournament) {
    setDialog({
      title: `Eliminar "${t.name}"`,
      message: 'Esta acción eliminará el torneo y sus datos asociados. ¿Continuar?',
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await request(`${API}/tournaments/${t.id}`, { method: 'DELETE' });
          setTournaments((prev) => prev.filter((x) => x.id !== t.id));
          if (editingId.current === t.id) setDrawerOpen(false);
          setMessage('Torneo eliminado.');
          setTimeout(() => setMessage(null), 3000);
        } catch (e) {
          setDialog({ title: 'Error', message: toErrorMessage(e, 'Error inesperado.'), tone: 'error' });
        }
      },
    });
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-3">
      {message && <Feedback tone="success" message={message} />}

      {/* Header uniforme */}
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35 shrink-0">🏅 Torneos</h3>
        <SearchSelect
          options={[{ value: '', label: 'Todas las ligas' }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]}
          value={filterLeague}
          onChange={setFilterLeague}
          placeholder="Filtrar por liga…"
        />
        <span className="flex-1" />
        <button type="button" onClick={openNew} className={primaryButtonClass}>+ Nuevo torneo</button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <EmptyState message={tournaments.length === 0 ? 'Sin torneos registrados.' : 'Sin resultados para el filtro.'} />
      ) : (
        <div className="rounded border border-white/10 overflow-hidden">
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Liga</th>
                <th className={tableHeaderClass}>Categoría</th>
                <th className={tableHeaderClass}>Tipo</th>
                <th className={tableHeaderClass}>Estado</th>
              </tr>
            </thead>
            <tbody className={tableBodyClass}>
              {filtered.map((t) => (
                <tr
                  key={t.id}
                  className={tableRowClass}
                  onClick={(e) => openEdit(t, e.currentTarget as HTMLTableRowElement)}
                >
                  <td className={tableCellClass}>
                    <p className="font-medium">{t.name}</p>
                    {t.shortName && <p className="text-[10px] text-white/40">{t.shortName}</p>}
                  </td>
                  <td className={tableCellClass + ' text-white/50'}>
                    {t.leagueId ? (leagueMap.get(t.leagueId) ?? t.leagueId) : <span className="text-white/25">Independiente</span>}
                  </td>
                  <td className={tableCellClass + ' text-white/50'}>{categoryMap.get(t.categoryId) ?? '—'}</td>
                  <td className={tableCellClass + ' text-white/40 text-[10px]'}>{t.structureType}</td>
                  <td className={tableCellClass}>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor[t.status]}`}>
                      {statusLabel[t.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      <SlideDrawer
        open={drawerOpen}
        title={editingId.current ? 'Editar torneo' : 'Nuevo torneo'}
        onClose={() => { setDrawerOpen(false); setStandingsModalOpen(false); }}
        anchorRef={anchorRef}
      >
        <div className="space-y-3 p-1">
          {error && <Feedback tone="error" message={error} />}

          <div className="grid grid-cols-2 gap-2">
            <Field label="Nombre">
              <input className={fieldClass} required value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </Field>
            <Field label="Nombre corto">
              <input className={fieldClass} value={form.shortName}
                onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
            </Field>
          </div>

          <Field label="Liga (opcional — dejar vacío si es independiente)">
            <SearchSelect
              options={[{ value: '', label: 'Sin liga (torneo independiente)' }, ...leagues.map((l) => ({ value: l.id, label: l.name }))]}
              value={form.leagueId}
              onChange={(v) => setForm((f) => ({ ...f, leagueId: v }))}
              placeholder="Seleccionar liga…"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Categoría">
              <SearchSelect
                options={[{ value: '', label: 'Sin categoría' }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
                value={form.categoryId}
                onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                placeholder="Seleccionar…"
              />
            </Field>
            <Field label="Temporada">
              <input className={fieldClass} value={form.season}
                onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Formato">
              <SearchSelect
                options={[
                  { value: 'round_robin', label: 'Round Robin' },
                  { value: 'single_elimination', label: 'Eliminación directa' },
                  { value: 'group_stage', label: 'Fase de grupos' },
                  { value: 'exhibition', label: 'Exhibición' },
                ]}
                value={form.structureType}
                onChange={(v) => setForm((f) => ({ ...f, structureType: v as Tournament['structureType'] }))}
              />
            </Field>
            <Field label="Estado">
              <SearchSelect
                options={[
                  { value: 'upcoming', label: 'Por jugar' },
                  { value: 'active', label: 'En curso' },
                  { value: 'finished', label: 'Finalizado' },
                ]}
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as Tournament['status'] }))}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Inicio">
              <input type="date" className={fieldClass} value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </Field>
            <Field label="Fin">
              <input type="date" className={fieldClass} value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </Field>
          </div>

          {/* Standings de solo lectura */}
          {form.standings.length > 0 && (
            <button
              type="button"
              className={secondaryButtonClass}
              onClick={() => setStandingsModalOpen(true)}
            >
              📊 Ver posiciones ({form.standings.length} equipos)
            </button>
          )}

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {editingId.current && (
              <button type="button"
                onClick={() => { const t = tournaments.find((x) => x.id === editingId.current); if (t) handleDelete(t); }}
                className={dangerButtonClass}>
                Eliminar
              </button>
            )}
            <button type="button" onClick={() => setDrawerOpen(false)} className={secondaryButtonClass}>Cancelar</button>
          </div>
        </div>
      </SlideDrawer>

      {standingsModalOpen && form.standings.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setStandingsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-white/10 bg-[#0f1117] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <h3 className="text-sm font-semibold text-white">{form.name} — Posiciones</h3>
              <button type="button" onClick={() => setStandingsModalOpen(false)}
                className="text-white/40 hover:text-white transition text-lg leading-none">✕</button>
            </div>
            <div className="overflow-auto max-h-96">
              <table className={tableClass}>
                <thead>
                  <tr className={tableHeadRowClass}>
                    {['#', 'Equipo', 'JG', 'JP', 'PCT', 'Dif'].map((h) => (
                      <th key={h} className={tableHeaderClass}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={tableBodyClass}>
                  {[...form.standings]
                    .sort((a, b) => (b.pct - a.pct) || (b.runDiff - a.runDiff))
                    .map((row: TournamentStanding, i) => (
                      <tr key={row.teamId} className="border-b border-white/5 last:border-0">
                        <td className={tableCellClass + ' text-white/40 tabular-nums'}>{i + 1}</td>
                        <td className={tableCellClass}>{teamMap.get(row.teamId) ?? row.teamId}</td>
                        <td className={tableCellClass + ' tabular-nums'}>{row.wins}</td>
                        <td className={tableCellClass + ' tabular-nums'}>{row.losses}</td>
                        <td className={tableCellClass + ' font-mono tabular-nums'}>{row.pct.toFixed(3)}</td>
                        <td className={`${tableCellClass} font-mono tabular-nums ${row.runDiff > 0 ? 'text-emerald-300' : row.runDiff < 0 ? 'text-red-400' : 'text-white/40'}`}>
                          {row.runDiff > 0 ? `+${row.runDiff}` : row.runDiff}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
