import { useCallback, useEffect, useState } from 'react';

import type { MatchMetadata, SponsorEntry } from '../matchMetadata';

const API = import.meta.env.DEV ? 'http://localhost:3001/api' : '/api';

function emptyMetadata(gameId: string): MatchMetadata {
  return {
    gameId,
    branding: { brandName: 'Mineros Broadcast', brandLogoAssetId: 'brands/mineros-broadcast-logo' },
    competition: { name: '', tournament: '', category: '' },
    venue: { name: '' },
    game: { gameType: '', remainingTime: '', configuredInnings: 7 },
    sponsors: [],
  };
}

function emptySponsor(): SponsorEntry {
  return { sponsorId: crypto.randomUUID(), displayName: '', logoAssetId: '', text: '', priority: 1, active: true };
}

// ── Inputs ────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      <input
        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
      <input
        className="rounded border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-white focus:border-amber-400 focus:outline-none"
        min={1}
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}

// ── Section ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-amber-400">{title}</h3>
      {children}
    </div>
  );
}

// ── Sponsor row ───────────────────────────────────────────────────────────────
function SponsorRow({
  sponsor,
  index,
  onChange,
  onRemove,
}: {
  sponsor: SponsorEntry;
  index: number;
  onChange: (updated: SponsorEntry) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded border border-zinc-700 bg-zinc-800 p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-xs font-semibold text-zinc-300">Sponsor #{index + 1}</span>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input
              checked={sponsor.active !== false}
              className="accent-amber-400"
              type="checkbox"
              onChange={(e) => onChange({ ...sponsor, active: e.target.checked })}
            />
            Activo
          </label>
          <button
            className="rounded bg-red-900/40 px-2 py-0.5 text-xs text-red-400 hover:bg-red-800/50"
            type="button"
            onClick={onRemove}
          >
            Eliminar
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field
          label="Nombre"
          value={sponsor.displayName}
          onChange={(v) => onChange({ ...sponsor, displayName: v })}
        />
        <Field
          label="Logo (asset ID)"
          placeholder="brands/sponsor-logo"
          value={sponsor.logoAssetId ?? ''}
          onChange={(v) => onChange({ ...sponsor, logoAssetId: v })}
        />
        <div className="col-span-2">
          <Field
            label="Texto / Claim"
            placeholder="Tecnología para la transmisión"
            value={sponsor.text ?? ''}
            onChange={(v) => onChange({ ...sponsor, text: v })}
          />
        </div>
        <NumberField
          label="Prioridad"
          value={sponsor.priority ?? 1}
          onChange={(v) => onChange({ ...sponsor, priority: v })}
        />
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export interface MatchMetadataEditorProps {
  gameId: string;
  onSaved?: () => void;
}

export function MatchMetadataEditor({ gameId, onSaved }: MatchMetadataEditorProps) {
  const [meta, setMeta] = useState<MatchMetadata>(emptyMetadata(gameId));
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'saved' | 'error'>('idle');
  const [activeTab, setActiveTab] = useState<'match' | 'sponsors'>('match');

  // Load existing metadata
  useEffect(() => {
    if (!gameId) return;
    fetch(`${API}/games/${encodeURIComponent(gameId)}/metadata`)
      .then((r) => r.json())
      .then((body: { result: string; payload: MatchMetadata }) => {
        if (body.result === 'ok' && body.payload) {
          setMeta({ ...emptyMetadata(gameId), ...body.payload });
        }
      })
      .catch(() => undefined);
  }, [gameId]);

  const patch = useCallback((fn: (prev: MatchMetadata) => MatchMetadata) => {
    setMeta((prev) => fn(prev));
    setStatus('idle');
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setStatus('idle');
    try {
      const r = await fetch(`${API}/games/${encodeURIComponent(gameId)}/metadata`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(meta),
      });
      const body = (await r.json()) as { result: string };
      if (body.result === 'ok') {
        setStatus('saved');
        onSaved?.();
        setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    } finally {
      setSaving(false);
    }
  }, [gameId, meta, onSaved]);

  const sponsors = meta.sponsors ?? [];

  return (
    <div className="flex flex-col gap-4 text-white">
      {/* Tabs */}
      <div className="flex gap-1 rounded bg-zinc-800 p-1">
        {(['match', 'sponsors'] as const).map((tab) => (
          <button
            key={tab}
            className={`flex-1 rounded px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-colors ${
              activeTab === tab ? 'bg-amber-500 text-black' : 'text-zinc-400 hover:text-white'
            }`}
            type="button"
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'match' ? '⚾ Partido' : '🏷️ Sponsors'}
          </button>
        ))}
      </div>

      {activeTab === 'match' && (
        <div className="flex flex-col gap-3">
          <Section title="Marca del broadcast">
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Nombre del broadcast"
                placeholder="Mineros Broadcast"
                value={meta.branding?.brandName ?? ''}
                onChange={(v) => patch((p) => ({ ...p, branding: { ...p.branding, brandName: v } }))}
              />
              <Field
                label="Logo (asset ID)"
                placeholder="brands/mineros-broadcast-logo"
                value={meta.branding?.brandLogoAssetId ?? ''}
                onChange={(v) => patch((p) => ({ ...p, branding: { ...p.branding, brandLogoAssetId: v } }))}
              />
            </div>
          </Section>

          <Section title="Competencia">
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Liga / Organización"
                placeholder="Liga Oriente"
                value={meta.competition?.name ?? ''}
                onChange={(v) => patch((p) => ({ ...p, competition: { ...p.competition, name: v } }))}
              />
              <Field
                label="Torneo"
                placeholder="Torneo Apertura 2026"
                value={meta.competition?.tournament ?? ''}
                onChange={(v) => patch((p) => ({ ...p, competition: { ...p.competition, tournament: v } }))}
              />
              <Field
                label="Categoría"
                placeholder="Infantil"
                value={meta.competition?.category ?? ''}
                onChange={(v) => patch((p) => ({ ...p, competition: { ...p.competition, category: v } }))}
              />
            </div>
          </Section>

          <Section title="Sede y tipo de juego">
            <div className="grid grid-cols-2 gap-2">
              <Field
                label="Estadio / Sede"
                placeholder="Estadio Lo Prado"
                value={meta.venue?.name ?? ''}
                onChange={(v) => patch((p) => ({ ...p, venue: { ...p.venue, name: v } }))}
              />
              <Field
                label="Tipo de juego"
                placeholder="Juego Regular"
                value={meta.game?.gameType ?? ''}
                onChange={(v) => patch((p) => ({ ...p, game: { ...p.game, gameType: v } }))}
              />
            </div>
          </Section>

          <Section title="Configuración del juego">
            <div className="grid grid-cols-2 gap-2">
              <NumberField
                label="Entradas configuradas"
                value={meta.game?.configuredInnings ?? 7}
                onChange={(v) => patch((p) => ({ ...p, game: { ...p.game, configuredInnings: v } }))}
              />
              <Field
                label="Tiempo restante (MM:SS)"
                placeholder="48:12"
                value={meta.game?.remainingTime ?? ''}
                onChange={(v) => patch((p) => ({ ...p, game: { ...p.game, remainingTime: v } }))}
              />
            </div>
          </Section>
        </div>
      )}

      {activeTab === 'sponsors' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-zinc-400">{sponsors.length} sponsor(s) configurado(s)</p>
            <button
              className="rounded bg-amber-500/20 px-3 py-1.5 text-xs font-semibold text-amber-400 hover:bg-amber-500/30"
              type="button"
              onClick={() => patch((p) => ({ ...p, sponsors: [...(p.sponsors ?? []), emptySponsor()] }))}
            >
              + Agregar sponsor
            </button>
          </div>

          {sponsors.length === 0 && (
            <div className="rounded border border-dashed border-zinc-700 py-8 text-center text-sm text-zinc-500">
              No hay sponsors. Haz clic en "Agregar sponsor" para comenzar.
            </div>
          )}

          <div className="flex flex-col gap-2">
            {sponsors.map((s: SponsorEntry, i: number) => (
              <SponsorRow
                key={s.sponsorId}
                index={i}
                sponsor={s}
                onChange={(updated) =>
                  patch((p) => {
                    const arr = [...(p.sponsors ?? [])];
                    arr[i] = updated;
                    return { ...p, sponsors: arr };
                  })
                }
                onRemove={() =>
                  patch((p) => ({ ...p, sponsors: (p.sponsors ?? []).filter((_: SponsorEntry, idx: number) => idx !== i) }))
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-between border-t border-zinc-700 pt-3">
        {status === 'saved' && <span className="text-xs text-green-400">✓ Guardado correctamente</span>}
        {status === 'error' && <span className="text-xs text-red-400">Error al guardar</span>}
        {status === 'idle' && <span />}
        <button
          className="rounded bg-amber-500 px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 hover:bg-amber-400"
          disabled={saving}
          type="button"
          onClick={() => void handleSave()}
        >
          {saving ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  );
}
