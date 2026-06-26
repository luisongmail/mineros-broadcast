import { useEffect, useMemo, useRef, useState } from 'react';

import { request } from './api';
import { SearchSelect } from './SearchSelect';
import { SlideDrawer } from './SlideDrawer';
import {
  AssetImage,
  ConfirmDialog,
  dangerButtonClass,
  Feedback,
  fieldClass,
  searchInputClass,
  filterSelectClass,
  Field,
  primaryButtonClass,
  selectedRowStyle,
  secondaryButtonClass,
  tableBodyClass,
  tableClass,
  tableHeadRowClass,
  tableHeaderClass,
  tableRowClass,
  tableCellClass,
  type DialogState,
} from './shared';
import { normalizeCategory, normalizeTeam, type Category, type Team } from './types';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

// ── Tipos de Club/Asociación ──────────────────────────────────────────────

interface Club {
  id: string;
  name: string;
  shortName: string;
  federated: boolean;
  associationId: string;
  associationName: string;
}

function normalizeClub(raw: unknown): Club {
  const r = (raw ?? {}) as Record<string, unknown>;
  return {
    id: String(r.id ?? ''),
    name: String(r.name ?? ''),
    shortName: String(r.shortName ?? r.short_name ?? ''),
    federated: Boolean(r.federated),
    associationId: String(r.associationId ?? r.association_id ?? ''),
    associationName: String(r.associationName ?? r.association_name ?? ''),
  };
}

// ── Form vacío ────────────────────────────────────────────────────────────

function emptyTeam(): Team {
  return {
    id: '', fullName: '', shortName: '', abbreviation: '',
    city: '', country: 'DO',
    clubId: '', clubName: '', clubFederated: false,
    clubAssociationId: '', clubAssociationName: '',
    primaryColor: '#D71920', secondaryColor: '#1B2F5B',
    logoAssetId: '', categoryId: '',
  };
}

// ── Badge de equipo ───────────────────────────────────────────────────────

function TeamBadge({ team, size = 'sm' }: { team: Team; size?: 'sm' | 'lg' }) {
  const dim = size === 'lg' ? 40 : 28;
  if (team.logoAssetId) {
    return <AssetImage assetId={team.logoAssetId} alt={team.abbreviation || team.fullName} size={dim} initials={team.abbreviation || team.fullName.slice(0, 2).toUpperCase()} />;
  }
  const dimClass = size === 'lg' ? 'h-10 w-10 text-sm' : 'h-7 w-7 text-[10px]';
  return (
    <div className={`${dimClass} shrink-0 rounded flex items-center justify-center font-bold text-white`} style={{ backgroundColor: team.primaryColor || '#1B2F5B' }}>
      {team.abbreviation || team.fullName.slice(0, 2).toUpperCase() || '?'}
    </div>
  );
}

// ── Editor principal ──────────────────────────────────────────────────────

export function TeamEditor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<Team>(emptyTeam());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialog, setDialog] = useState<DialogState | null>(null);

  // Filtros
  const [filterName, setFilterName] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const anchorRef = useRef<HTMLElement | null>(null);
  const editingId = useRef<string | null>(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch(`${API}/teams`).then((r) => r.json() as Promise<{ payload?: unknown[] }>),
      fetch(`${API}/categories`).then((r) => r.json() as Promise<{ payload?: unknown[] }>),
      fetch(`${API}/clubs`).then((r) => r.json() as Promise<{ payload?: unknown[] }>),
    ])
      .then(([t, c, cl]) => {
        setTeams((t.payload ?? []).map(normalizeTeam));
        setCategories((c.payload ?? []).map(normalizeCategory));
        setClubs((cl.payload ?? []).map(normalizeClub));
      })
      .catch(() => { setTeams([]); setCategories([]); setClubs([]); })
      .finally(() => setLoading(false));
  }, []);

  const categoryMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  // Filtrado
  const filtered = useMemo(() => teams.filter((t) => {
    const q = filterName.toLowerCase();
    if (q && !t.fullName.toLowerCase().includes(q) && !t.shortName.toLowerCase().includes(q)) return false;
    if (filterCat && t.categoryId !== filterCat) return false;
    return true;
  }), [teams, filterName, filterCat]);

  function openNew() {
    editingId.current = null;
    anchorRef.current = null;
    setForm(emptyTeam());
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(team: Team, row: HTMLTableRowElement) {
    editingId.current = team.id;
    anchorRef.current = row as HTMLElement;
    setForm({ ...team });
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  // Al seleccionar un club, propaga su estado de federación y asociación
  function selectClub(clubId: string) {
    const club = clubs.find((c) => c.id === clubId);
    setForm((f) => ({
      ...f,
      clubId,
      clubName:            club?.name            ?? '',
      clubFederated:       club?.federated        ?? false,
      clubAssociationId:   club?.associationId    ?? '',
      clubAssociationName: club?.associationName  ?? '',
    }));
  }

  async function handleSave() {
    if (!form.fullName.trim()) { setError('El nombre completo es obligatorio.'); return; }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name:            form.fullName,
        short_name:      form.shortName,
        abbreviation:    form.abbreviation ? form.abbreviation.slice(0, 4).toUpperCase() : null,
        logo_asset_id:   form.logoAssetId  || null,
        city:            form.city         || null,
        country:         form.country      || null,
        club_id:         form.clubId       || null,
        primary_color:   form.primaryColor || null,
        secondary_color: form.secondaryColor || null,
        category_ids:    form.categoryId ? [form.categoryId] : [],
      };
      let saved_: Team;
      if (editingId.current) {
        const res = await request(`/api/teams/${editingId.current}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        saved_ = normalizeTeam(res);
        setTeams((prev) => prev.map((t) => t.id === saved_.id ? saved_ : t));
      } else {
        const res = await request('/api/teams', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        saved_ = normalizeTeam(res);
        setTeams((prev) => [...prev, saved_]);
      }
      setSaved(true);
      setForm(saved_);
      setTimeout(() => { setSaved(false); setDrawerOpen(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(team: Team) {
    setDialog({
      title: '¿Eliminar equipo?',
      message: `«${team.fullName}» será eliminado permanentemente.`,
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await request(`/api/teams/${team.id}`, { method: 'DELETE' });
          setTeams((prev) => prev.filter((t) => t.id !== team.id));
          if (editingId.current === team.id) setDrawerOpen(false);
        } catch (e) {
          setDialog({ title: 'Error al eliminar', message: e instanceof Error ? e.message : 'Error', tone: 'error' });
        }
      },
    });
  }


  const selectedClub = clubs.find((c) => c.id === form.clubId);

  if (loading) {
    return <div className="flex items-center gap-2 p-4 text-xs text-white/40"><span className="animate-spin inline-block h-3 w-3 rounded-full border-2 border-white/20 border-t-white/70" /> Cargando…</div>;
  }

  return (
    <div className="space-y-3">
      {/* Cabecera y filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35 shrink-0">🏅 Equipos</h3>
        <input
          className={searchInputClass}
          placeholder="Buscar por nombre…"
          value={filterName}
          onChange={(e) => setFilterName(e.target.value)}
        />
        <select
          className={filterSelectClass}
          value={filterCat}
          onChange={(e) => setFilterCat(e.target.value)}
        >
          <option value="">Todas las categorías</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="button" onClick={openNew} className={primaryButtonClass}>+ Nuevo equipo</button>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <p className="text-xs text-white/30">{teams.length === 0 ? 'Sin equipos registrados.' : 'Sin resultados para el filtro aplicado.'}</p>
      ) : (
        <div className="rounded border border-white/10 overflow-hidden">
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeaderClass + ' w-8'}></th>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Categoría</th>
                <th className={tableHeaderClass}>Club</th>
                <th className={tableHeaderClass}>Federado</th>
                <th className={tableHeaderClass}>Asociación</th>
              </tr>
            </thead>
            <tbody className={tableBodyClass}>
              {filtered.map((team) => (
                <tr
                  key={team.id}
                  className={tableRowClass}
                  style={drawerOpen && editingId.current === team.id ? selectedRowStyle : undefined}
                  onClick={(e) => openEdit(team, e.currentTarget as HTMLTableRowElement)}
                >
                  <td className={tableCellClass}><TeamBadge team={team} /></td>
                  <td className={tableCellClass}>
                    <p className="font-medium">{team.fullName}</p>
                    {team.shortName && <p className="text-[10px] text-white/40">{team.shortName}</p>}
                  </td>
                  <td className={tableCellClass}>
                    {team.categoryId
                      ? <span className="rounded-full border border-white/15 px-2 py-0.5 text-[9px] text-white/50">{categoryMap.get(team.categoryId)?.name ?? team.categoryId}</span>
                      : <span className="text-white/25">—</span>}
                  </td>
                  <td className={tableCellClass + ' text-white/50'}>{team.clubName || '—'}</td>
                  <td className={tableCellClass}>
                    {team.clubId ? (
                      <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${team.clubFederated ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                        {team.clubFederated ? 'Sí' : 'No'}
                      </span>
                    ) : <span className="text-white/20">—</span>}
                  </td>
                  <td className={tableCellClass + ' text-white/50'}>{team.clubAssociationName || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer */}
      <SlideDrawer
        open={drawerOpen}
        title={editingId.current ? `Editar: ${form.fullName || '…'}` : 'Nuevo equipo'}
        onClose={() => setDrawerOpen(false)}
        anchorRef={anchorRef as React.RefObject<HTMLElement | null>}
      >
        <div className="space-y-3 p-1">
          {error && <Feedback tone="error" message={error} />}
          {saved  && <Feedback tone="success" message="Guardado ✓" />}

          {/* Identidad */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre completo">
              <input className={fieldClass} value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} placeholder="Mineros de Santiago" />
            </Field>
            <Field label="Nombre corto">
              <input className={fieldClass} value={form.shortName} onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} placeholder="Mineros" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Abreviatura (máx 4)">
              <input className={fieldClass} maxLength={4} value={form.abbreviation} onChange={(e) => setForm((f) => ({ ...f, abbreviation: e.target.value.toUpperCase() }))} placeholder="MIN" />
            </Field>
            <Field label="Logo Asset ID">
              <div className="flex items-center gap-2">
                <input className={`${fieldClass} flex-1`} value={form.logoAssetId} onChange={(e) => setForm((f) => ({ ...f, logoAssetId: e.target.value }))} placeholder="teams/mineros-logo" />
                {form.logoAssetId && (
                  <AssetImage assetId={form.logoAssetId} alt="Vista previa" size={40} initials={form.abbreviation || form.fullName.slice(0, 2).toUpperCase()} />
                )}
              </div>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ciudad">
              <input className={fieldClass} value={form.city} onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))} placeholder="Santiago" />
            </Field>
            <Field label="País (ISO)">
              <input className={fieldClass} maxLength={4} value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value.toUpperCase() }))} placeholder="CL" />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Color primario">
              <div className="flex gap-2">
                <input type="color" className="h-9 w-10 shrink-0 rounded border border-white/10 bg-black p-0.5 cursor-pointer" value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
                <input className={fieldClass} value={form.primaryColor} onChange={(e) => setForm((f) => ({ ...f, primaryColor: e.target.value }))} />
              </div>
            </Field>
            <Field label="Color secundario">
              <div className="flex gap-2">
                <input type="color" className="h-9 w-10 shrink-0 rounded border border-white/10 bg-black p-0.5 cursor-pointer" value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
                <input className={fieldClass} value={form.secondaryColor} onChange={(e) => setForm((f) => ({ ...f, secondaryColor: e.target.value }))} />
              </div>
            </Field>
          </div>

          {/* Categorías */}
          {categories.length > 0 && (
            <div>
              <Field label="Categoría">
                <SearchSelect
                  options={[
                    { value: '', label: 'Sin categoría' },
                    ...categories.map((c) => ({
                      value: c.id,
                      label: c.name,
                      sublabel: c.description || undefined,
                    })),
                  ]}
                  value={form.categoryId}
                  onChange={(v) => setForm((f) => ({ ...f, categoryId: v }))}
                  placeholder="Seleccionar categoría…"
                />
              </Field>
            </div>
          )}

          {/* Club */}
          <div className="border-t border-white/8 pt-3">
            <Field label="Club">
              <SearchSelect
                options={[
                  { value: '', label: 'Sin club asignado' },
                  ...clubs.map((c) => ({
                    value: c.id,
                    label: c.name,
                    sublabel: c.federated
                      ? `Federado · ${c.associationName || 'Sin asociación'}`
                      : 'No federado',
                  })),
                ]}
                value={form.clubId}
                onChange={(v) => selectClub(v)}
                placeholder="Seleccionar club…"
              />
            </Field>

            {selectedClub && (
              <div className="mt-2 rounded border border-white/10 bg-white/5 px-3 py-2 flex items-center gap-3">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white/80">{selectedClub.name}</p>
                  {selectedClub.associationName && (
                    <p className="text-[10px] text-white/40">{selectedClub.associationName}</p>
                  )}
                </div>
                <span className={`rounded px-2 py-0.5 text-[9px] font-semibold uppercase ${selectedClub.federated ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                  {selectedClub.federated ? 'Federado' : 'No federado'}
                </span>
              </div>
            )}

            {clubs.length === 0 && (
              <p className="mt-1 text-[10px] text-white/30">Sin clubs registrados. Créalos en el tab 🏛️ Clubs.</p>
            )}
          </div>

          {/* Preview badge */}
          {form.fullName && (
            <div className="flex items-center gap-3 rounded border border-white/10 bg-white/5 p-3">
              <TeamBadge team={form} size="lg" />
              <div>
                <p className="text-sm font-semibold text-white">{form.fullName}</p>
                <p className="text-[10px] text-white/60 font-mono">{form.abbreviation || '—'}</p>
                <p className="text-[10px] text-white/40">
                  {form.categoryId ? (categoryMap.get(form.categoryId)?.name ?? form.categoryId) : 'Sin categoría'}
                </p>
              </div>
              {form.logoAssetId && (
                <p className="ml-auto text-[9px] text-white/25 font-mono truncate max-w-24">{form.logoAssetId}</p>
              )}
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {editingId.current && (
              <button type="button" onClick={() => { const t = teams.find((x) => x.id === editingId.current); if (t) handleDelete(t); }} className={dangerButtonClass}>
                Eliminar
              </button>
            )}
            <button type="button" onClick={() => setDrawerOpen(false)} className={secondaryButtonClass}>Cancelar</button>
          </div>
        </div>
      </SlideDrawer>

      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
