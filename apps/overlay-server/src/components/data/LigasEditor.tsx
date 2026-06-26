import { useEffect, useRef, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockLeagues } from './mockData';
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
import { normalizeLeague, type League } from './types';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

const emptyLeague = (): League => ({
  id: '', name: '', shortName: '', country: '', logoAssetId: '', active: true,
});

export function LigasEditor() {
  const [leagues, setLeagues]     = useState<League[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [message, setMessage]     = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm]           = useState<League>(emptyLeague());
  const [saving, setSaving]       = useState(false);
  const [saved, setSaved]         = useState(false);
  const [dialog, setDialog]       = useState<DialogState | null>(null);
  const editingId                 = useRef<string | null>(null);
  const anchorRef                 = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setLoading(true);
    request<{ leagues?: unknown[] }>(`${API}/leagues`)
      .then((data) => {
        const raw = data.leagues ?? [];
        setLeagues(raw.length > 0 ? raw.map(normalizeLeague) : mockLeagues);
      })
      .catch(() => setLeagues(mockLeagues))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    editingId.current = null;
    anchorRef.current = null;
    setForm(emptyLeague());
    setError(null);
    setSaved(false);
    setDrawerOpen(true);
  }

  function openEdit(league: League, row: HTMLTableRowElement) {
    editingId.current = league.id;
    anchorRef.current = row;
    setForm({ ...league });
    setError(null);
    setSaved(false);
    setDrawerOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const isNew = !editingId.current;
      const payload = { ...form, id: isNew ? generateId(form.name) : form.id };
      if (isNew) {
        const res = await request<{ league?: unknown }>(`${API}/leagues`, {
          method: 'POST', body: JSON.stringify(payload),
        });
        setLeagues((prev) => [...prev, normalizeLeague(res.league ?? payload)]);
        editingId.current = payload.id;
      } else {
        const res = await request<{ league?: unknown }>(`${API}/leagues/${payload.id}`, {
          method: 'PUT', body: JSON.stringify(payload),
        });
        setLeagues((prev) => prev.map((l) => l.id === payload.id ? normalizeLeague(res.league ?? payload) : l));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      setMessage(isNew ? 'Liga creada.' : 'Liga actualizada.');
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setError(toErrorMessage(e, "Error inesperado."));
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(league: League) {
    setDialog({
      title: `Eliminar "${league.name}"`,
      message: 'Esta acción no se puede deshacer. ¿Eliminar la liga?',
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await request(`${API}/leagues/${league.id}`, { method: 'DELETE' });
          setLeagues((prev) => prev.filter((l) => l.id !== league.id));
          if (editingId.current === league.id) setDrawerOpen(false);
          setMessage('Liga eliminada.');
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

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/30">{leagues.length} liga{leagues.length !== 1 ? 's' : ''}</p>
        <button type="button" onClick={openNew} className={primaryButtonClass}>+ Nueva liga</button>
      </div>

      {/* Lista */}
      {leagues.length === 0 ? (
        <EmptyState message="Sin ligas registradas." />
      ) : (
        <div className="rounded border border-white/10 overflow-hidden">
          <table className={tableClass}>
            <thead>
              <tr className={tableHeadRowClass}>
                <th className={tableHeaderClass}>Nombre</th>
                <th className={tableHeaderClass}>Abrev.</th>
                <th className={tableHeaderClass}>País</th>
                <th className={tableHeaderClass}>Estado</th>
              </tr>
            </thead>
            <tbody className={tableBodyClass}>
              {leagues.map((league) => (
                <tr
                  key={league.id}
                  className={tableRowClass}
                  onClick={(e) => openEdit(league, e.currentTarget as HTMLTableRowElement)}
                >
                  <td className={tableCellClass + ' font-medium'}>{league.name}</td>
                  <td className={tableCellClass + ' text-white/50 font-mono'}>{league.shortName || '—'}</td>
                  <td className={tableCellClass + ' text-white/50'}>{league.country || '—'}</td>
                  <td className={tableCellClass}>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${league.active ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {league.active ? 'Activa' : 'Inactiva'}
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
        title={editingId.current ? 'Editar liga' : 'Nueva liga'}
        onClose={() => setDrawerOpen(false)}
        anchorRef={anchorRef}
      >
        <div className="space-y-3 p-1">
          {error && <Feedback tone="error" message={error} />}
          <Field label="Nombre">
            <input className={fieldClass} required value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Nombre corto">
            <input className={fieldClass} value={form.shortName}
              onChange={(e) => setForm((f) => ({ ...f, shortName: e.target.value }))} />
          </Field>
          <Field label="País">
            <input className={fieldClass} value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
          </Field>
          <Field label="Logo (asset ID)">
            <input className={fieldClass} value={form.logoAssetId}
              onChange={(e) => setForm((f) => ({ ...f, logoAssetId: e.target.value }))} />
          </Field>
          <label className="flex items-center gap-2 text-xs text-white/70 cursor-pointer">
            <input type="checkbox" checked={form.active}
              onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
              className="accent-yellow-400" />
            Activa
          </label>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {editingId.current && (
              <button type="button" onClick={() => { const l = leagues.find((x) => x.id === editingId.current); if (l) handleDelete(l); }} className={dangerButtonClass}>
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
