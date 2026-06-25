import { useEffect, useState } from 'react';

import type { MatchMetadata, SponsorEntry } from '../matchMetadata';
import { SearchSelect } from './data/SearchSelect';
import { normalizeSponsor, type Sponsor } from './data/types';
import { SlideDrawer } from './data/SlideDrawer';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  const body = await res.json() as { result?: string; payload?: T; error?: string };
  if (!res.ok || body.result === 'error') throw new Error((body.error as string | undefined) ?? `HTTP ${res.status}`);
  return (body.payload ?? body) as T;
}

// ── Sección: CRUD de sponsors (base de datos) ─────────────────────────────

function emptySponsor(): Sponsor {
  return { id: '', name: '', brand: '', logoAssetId: '', priority: 1, status: 'draft', startDate: '', endDate: '', active: true };
}

function SponsorCrudSection() {
  const [sponsors, setSponsors] = useState<Sponsor[]>([]);
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<Sponsor>(emptySponsor());
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    apiFetch<unknown[]>('/sponsors')
      .then((list) => setSponsors(list.map(normalizeSponsor)))
      .catch(() => setSponsors([]))
      .finally(() => setLoading(false));
  }, []);

  function openNew() {
    setForm(emptySponsor());
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  function openEdit(s: Sponsor) {
    setForm({ ...s });
    setSaved(false);
    setError(null);
    setDrawerOpen(true);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        brand: form.brand,
        asset_id: form.logoAssetId,
        priority: form.priority,
        status: form.status,
        start_date: form.startDate || null,
        end_date: form.endDate || null,
      };
      if (form.id) {
        await apiFetch(`/sponsors/${form.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setSponsors((prev) => prev.map((s) => s.id === form.id ? { ...form } : s));
      } else {
        const created = await apiFetch<Sponsor>('/sponsors', { method: 'POST', body: JSON.stringify(payload) });
        setSponsors((prev) => [...prev, normalizeSponsor(created)]);
      }
      setSaved(true);
      setTimeout(() => { setSaved(false); setDrawerOpen(false); }, 1200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este sponsor?')) return;
    try {
      await apiFetch(`/sponsors/${id}`, { method: 'DELETE' });
      setSponsors((prev) => prev.filter((s) => s.id !== id));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error al eliminar');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35">🤝 Sponsors registrados</h3>
        <button type="button" onClick={openNew} className="rounded bg-mineros-gold px-3 py-1 text-xs font-semibold text-black hover:bg-mineros-gold/80 transition">
          + Nuevo sponsor
        </button>
      </div>

      {loading && <p className="text-xs text-white/30">Cargando…</p>}

      {!loading && sponsors.length === 0 && (
        <p className="text-xs text-white/30">Sin sponsors registrados.</p>
      )}

      {!loading && sponsors.length > 0 && (
        <div className="rounded border border-white/10 overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-white/5 text-white/40 uppercase text-[9px] tracking-wider">
                <th className="px-3 py-2 text-left">Nombre</th>
                <th className="px-3 py-2 text-left">Marca</th>
                <th className="px-3 py-2 text-left">Estado</th>
                <th className="px-3 py-2 text-left">Prioridad</th>
                <th className="px-2 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sponsors.map((s) => (
                <tr key={s.id} className="hover:bg-white/5 transition">
                  <td className="px-3 py-2 text-white/85 font-medium">{s.name}</td>
                  <td className="px-3 py-2 text-white/50">{s.brand}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase ${s.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-white/50">{s.priority}</td>
                  <td className="px-2 py-2 flex gap-1">
                    <button type="button" onClick={() => openEdit(s)} className="text-white/40 hover:text-mineros-gold transition text-xs">✏️</button>
                    <button type="button" onClick={() => { void handleDelete(s.id); }} className="text-white/40 hover:text-red-400 transition text-xs">🗑️</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <SlideDrawer open={drawerOpen} title={form.id ? 'Editar sponsor' : 'Nuevo sponsor'} onClose={() => setDrawerOpen(false)}>
        <div className="space-y-3 p-1">
          {error && <p className="rounded bg-red-900/30 border border-red-500/30 px-3 py-2 text-xs text-red-300">{error}</p>}
          {(['name', 'brand'] as const).map((key) => (
            <label key={key} className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{key === 'name' ? 'Nombre' : 'Marca'}</span>
              <input
                className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
              />
            </label>
          ))}
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Logo Asset ID</span>
            <input
              className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
              value={form.logoAssetId}
              onChange={(e) => setForm((f) => ({ ...f, logoAssetId: e.target.value }))}
              placeholder="sponsors/acme-logo"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Prioridad</span>
              <input
                type="number"
                min={1}
                className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
                value={form.priority}
                onChange={(e) => setForm((f) => ({ ...f, priority: Number(e.target.value) }))}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Estado</span>
              <SearchSelect
                options={[
                  { value: 'draft', label: 'Draft' },
                  { value: 'active', label: 'Activo' },
                  { value: 'inactive', label: 'Inactivo' },
                ]}
                value={form.status}
                onChange={(v) => setForm((f) => ({ ...f, status: v as Sponsor['status'] }))}
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Desde</span>
              <input type="date" className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">Hasta</span>
              <input type="date" className="block w-full rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
            </label>
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={() => { void handleSave(); }} disabled={saving} className="rounded bg-mineros-gold px-4 py-1.5 text-sm font-semibold text-black hover:bg-mineros-gold/80 disabled:opacity-50 transition">
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setDrawerOpen(false)} className="rounded border border-white/20 px-4 py-1.5 text-sm text-white/70 hover:bg-white/10 transition">
              Cancelar
            </button>
          </div>
        </div>
      </SlideDrawer>
    </div>
  );
}

// ── Sección: asignación de sponsors al partido activo ─────────────────────

function GameSponsorsSection({ gameId }: { gameId: string }) {
  const [allSponsors, setAllSponsors] = useState<Sponsor[]>([]);
  const [assigned, setAssigned] = useState<SponsorEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Cargar todos los sponsors disponibles y los asignados al partido
  useEffect(() => {
    void apiFetch<unknown[]>('/sponsors')
      .then((list) => setAllSponsors(list.map(normalizeSponsor)))
      .catch(() => setAllSponsors([]));

    void apiFetch<{ sponsors?: SponsorEntry[] }>(`/games/${gameId}/metadata`)
      .then((meta) => setAssigned(meta.sponsors ?? []))
      .catch(() => setAssigned([]));
  }, [gameId]);

  function isAssigned(id: string) {
    return assigned.some((a) => a.sponsorId === id);
  }

  function toggle(s: Sponsor) {
    if (isAssigned(s.id)) {
      setAssigned((prev) => prev.filter((a) => a.sponsorId !== s.id));
    } else {
      setAssigned((prev) => [...prev, {
        sponsorId: s.id,
        displayName: s.name,
        logoAssetId: s.logoAssetId || undefined,
        priority: s.priority,
        active: true,
      }]);
    }
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const metaRes = await fetch(`${API}/games/${gameId}/metadata`);
      const metaBody = await metaRes.json() as { result?: string; payload?: Partial<MatchMetadata> };
      const current: MatchMetadata = (metaBody.result === 'ok' && metaBody.payload)
        ? (metaBody.payload as MatchMetadata)
        : { gameId, branding: { brandName: '', brandLogoAssetId: '' }, competition: { name: '', tournament: '', category: '' }, venue: { name: '' }, game: { gameType: '', remainingTime: '', configuredInnings: 7 }, sponsors: [] };

      const updated: MatchMetadata = { ...current, sponsors: assigned };
      await fetch(`${API}/games/${gameId}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ } finally {
      setSaving(false);
    }
  }

  if (!gameId) return <p className="text-xs text-white/30">Carga un partido primero.</p>;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-white/35">📎 Sponsors del partido</h3>
        <button
          type="button"
          onClick={() => { void handleSave(); }}
          disabled={saving}
          className="rounded bg-mineros-navy border border-white/15 px-3 py-1 text-xs font-semibold text-white hover:bg-white/10 disabled:opacity-50 transition"
        >
          {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar asignación'}
        </button>
      </div>
      {allSponsors.length === 0 ? (
        <p className="text-xs text-white/30">Sin sponsors disponibles. Créalos en la sección de arriba.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {allSponsors.map((s) => {
            const on = isAssigned(s.id);
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggle(s)}
                className={`flex items-center gap-2 rounded border px-3 py-2 text-left text-xs transition ${on ? 'border-mineros-gold bg-mineros-gold/10 text-mineros-gold' : 'border-white/15 bg-white/5 text-white/60 hover:border-white/30'}`}
              >
                <span className="text-base">{on ? '✅' : '☐'}</span>
                <span>
                  <p className="font-semibold">{s.name}</p>
                  {s.brand && <p className="text-[10px] opacity-60">{s.brand}</p>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Tab principal ─────────────────────────────────────────────────────────

export function SponsorsTab({ currentGameId }: { currentGameId: string }) {
  return (
    <div className="p-4 space-y-8">
      <SponsorCrudSection />
      <div className="border-t border-white/10 pt-6">
        <GameSponsorsSection gameId={currentGameId} />
      </div>
    </div>
  );
}
