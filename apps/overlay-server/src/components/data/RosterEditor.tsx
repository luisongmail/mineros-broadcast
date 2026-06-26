import { useEffect, useMemo, useRef, useState } from 'react';

import { request, toErrorMessage } from './api';
import { mockPlayersByTeam, mockStaffByTeam, mockTeams } from './mockData';
import { SearchSelect } from './SearchSelect';
import { SlideDrawer } from './SlideDrawer';
import {
  AssetImage,
  ConfirmDialog,
  dangerButtonClass,
  EmptyState,
  Feedback,
  Field,
  fieldClass,
  LoadingState,
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
import { normalizePlayer, normalizeStaffMember, normalizeTeam, type Player, type StaffMember, type StaffRole, type Team } from './types';

const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'UT', 'DH'] as const;
const staffRoles: StaffRole[] = ['manager', 'coach_bateo', 'coach_bases', 'pitcher_coach', 'utilero', 'otro'];

const emptyPlayer = (): Player => ({ id: '', fullName: '', nickname: '', number: '', position: 'UT', bats: 'R', throws: 'R', photoAssetId: '', birthDate: '', nationality: '', status: 'active' });
const emptyStaff  = (): StaffMember => ({ id: '', name: '', number: '', role: 'manager', photoAssetId: '' });

export function RosterEditor() {
  const [teams, setTeams]               = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [players, setPlayers]           = useState<Player[]>([]);
  const [staff, setStaff]               = useState<StaffMember[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving]             = useState(false);
  const [saved, setSaved]               = useState(false);
  const [error, setError]               = useState<string | null>(null);
  const [dialog, setDialog]             = useState<DialogState | null>(null);

  // Drawer jugador
  const [playerDrawerOpen, setPlayerDrawerOpen] = useState(false);
  const [playerForm, setPlayerForm]             = useState<Player>(emptyPlayer());
  const playerAnchor = useRef<HTMLTableRowElement | null>(null);

  // Drawer staff
  const [staffDrawerOpen, setStaffDrawerOpen] = useState(false);
  const [staffForm, setStaffForm]             = useState<StaffMember>(emptyStaff());
  const staffAnchor = useRef<HTMLTableRowElement | null>(null);

  useEffect(() => {
    setLoadingTeams(true);
    request<unknown[]>('/api/teams')
      .then((payload) => {
        const t = payload.map(normalizeTeam);
        setTeams(t);
        setSelectedTeamId((cur) => cur || t[0]?.id || '');
      })
      .catch(() => {
        setTeams(mockTeams);
        setSelectedTeamId(mockTeams[0]?.id ?? '');
      })
      .finally(() => setLoadingTeams(false));
  }, []);

  useEffect(() => {
    if (!selectedTeamId) { setPlayers([]); setStaff([]); return; }
    setLoadingRoster(true);
    setError(null);
    Promise.all([
      request<unknown[]>(`/api/teams/${selectedTeamId}/players`),
      request<unknown[]>(`/api/teams/${selectedTeamId}/staff`),
    ])
      .then(([p, s]) => { setPlayers(p.map(normalizePlayer)); setStaff(s.map(normalizeStaffMember)); })
      .catch(() => { setPlayers(mockPlayersByTeam[selectedTeamId] ?? []); setStaff(mockStaffByTeam[selectedTeamId] ?? []); })
      .finally(() => setLoadingRoster(false));
  }, [selectedTeamId]);

  const teamName = useMemo(() => teams.find((t) => t.id === selectedTeamId)?.shortName ?? 'Equipo', [teams, selectedTeamId]);

  // ── Jugadores ─────────────────────────────────────────────────────────────

  function openNewPlayer() {
    playerAnchor.current = null;
    setPlayerForm(emptyPlayer());
    setSaved(false);
    setPlayerDrawerOpen(true);
    setStaffDrawerOpen(false);
  }

  function openEditPlayer(player: Player, row: HTMLTableRowElement) {
    playerAnchor.current = row;
    setPlayerForm({ ...player });
    setSaved(false);
    setPlayerDrawerOpen(true);
    setStaffDrawerOpen(false);
  }

  async function savePlayer() {
    if (!selectedTeamId) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !playerForm.id;
      const path  = isNew ? `/api/teams/${selectedTeamId}/players` : `/api/players/${playerForm.id}`;
      const body  = {
        name: playerForm.fullName, first_name: playerForm.fullName.split(' ')[0] ?? '',
        last_name: playerForm.fullName.split(' ').slice(1).join(' ') || null,
        nickname: playerForm.nickname || null, number: playerForm.number,
        position: playerForm.position, bats: playerForm.bats, throws: playerForm.throws,
        photo_asset_id: playerForm.photoAssetId || null, date_of_birth: playerForm.birthDate || null,
        nationality: playerForm.nationality || 'DO', status: playerForm.status,
      };
      const response = await request<unknown>(path, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = normalizePlayer(
        response && typeof response === 'object' && 'player' in response
          ? (response as { player?: unknown }).player
          : response,
      );
      setPlayers((prev) => isNew ? [...prev, result] : prev.map((p) => p.id === result.id ? result : p));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(toErrorMessage(e, 'No se pudo guardar el jugador.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeletePlayer(player: Player) {
    setDialog({
      title: `Eliminar "${player.fullName}"`,
      message: '¿Eliminar este jugador del roster?',
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await request(`/api/players/${player.id}`, { method: 'DELETE' });
          setPlayers((prev) => prev.filter((p) => p.id !== player.id));
          setPlayerDrawerOpen(false);
        } catch (e) {
          setDialog({ title: 'Error', message: toErrorMessage(e, 'Error inesperado.'), tone: 'error' });
        }
      },
    });
  }

  // ── Staff ─────────────────────────────────────────────────────────────────

  function openNewStaff() {
    staffAnchor.current = null;
    setStaffForm(emptyStaff());
    setSaved(false);
    setStaffDrawerOpen(true);
    setPlayerDrawerOpen(false);
  }

  function openEditStaff(member: StaffMember, row: HTMLTableRowElement) {
    staffAnchor.current = row;
    setStaffForm({ ...member });
    setSaved(false);
    setStaffDrawerOpen(true);
    setPlayerDrawerOpen(false);
  }

  async function saveStaff() {
    if (!selectedTeamId) return;
    setSaving(true);
    setError(null);
    try {
      const isNew = !staffForm.id;
      const path  = isNew ? `/api/teams/${selectedTeamId}/staff` : `/api/staff/${staffForm.id}`;
      const body  = { name: staffForm.name, number: staffForm.number || null, role: staffForm.role, photo_asset_id: staffForm.photoAssetId || null, active: true };
      const response = await request<unknown>(path, { method: isNew ? 'POST' : 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const result = normalizeStaffMember(
        response && typeof response === 'object' && 'staff' in response
          ? (response as { staff?: unknown }).staff
          : response,
      );
      setStaff((prev) => isNew ? [...prev, result] : prev.map((s) => s.id === result.id ? result : s));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(toErrorMessage(e, 'No se pudo guardar el staff.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmDeleteStaff(member: StaffMember) {
    setDialog({
      title: `Eliminar "${member.name}"`,
      message: '¿Eliminar este miembro del cuerpo técnico?',
      tone: 'danger',
      confirmLabel: 'Eliminar',
      onConfirm: async () => {
        try {
          await request(`/api/staff/${member.id}`, { method: 'DELETE' });
          setStaff((prev) => prev.filter((s) => s.id !== member.id));
          setStaffDrawerOpen(false);
        } catch (e) {
          setDialog({ title: 'Error', message: toErrorMessage(e, 'Error inesperado.'), tone: 'error' });
        }
      },
    });
  }

  if (loadingTeams) return <LoadingState message="Cargando equipos..." />;

  return (
    <div className="space-y-4">
      {error && <Feedback tone="error" message={error} />}

      {/* Selector de equipo */}
      <div className="flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <SearchSelect
            options={teams.map((t) => ({ value: t.id, label: t.fullName, sublabel: t.shortName }))}
            value={selectedTeamId}
            onChange={(v) => { setSelectedTeamId(v); setPlayerDrawerOpen(false); setStaffDrawerOpen(false); }}
            placeholder="Seleccionar equipo…"
          />
        </div>
        {selectedTeamId && (
          <p className="text-[10px] text-white/30">
            {players.length} jugador{players.length !== 1 ? 'es' : ''} · {staff.length} técnico{staff.length !== 1 ? 's' : ''}
          </p>
        )}
      </div>

      {loadingRoster ? <LoadingState message="Cargando roster..." /> : !selectedTeamId ? (
        <p className="text-xs text-white/30">Selecciona un equipo para ver su roster.</p>
      ) : (
        <>
          {/* ── Jugadores ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">👕 Jugadores · {teamName}</p>
              <button type="button" onClick={openNewPlayer} className={primaryButtonClass}>+ Nuevo jugador</button>
            </div>

            {players.length === 0 ? (
              <EmptyState message="Sin jugadores en este roster." />
            ) : (
              <div className="rounded border border-white/10 overflow-hidden">
                <table className={tableClass}>
                  <thead>
                    <tr className={tableHeadRowClass}>
                      <th className={tableHeaderClass + ' w-8'}></th>
                      <th className={tableHeaderClass + ' w-8'}>#</th>
                      <th className={tableHeaderClass}>Nombre</th>
                      <th className={tableHeaderClass}>Pos</th>
                      <th className={tableHeaderClass}>B/L</th>
                      <th className={tableHeaderClass}>Estado</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {players.map((player) => (
                      <tr
                        key={player.id}
                        className={tableRowClass}
                        style={playerDrawerOpen && playerForm.id === player.id ? selectedRowStyle : undefined}
                        onClick={(e) => openEditPlayer(player, e.currentTarget as HTMLTableRowElement)}
                      >
                        <td className="p-2">
                          <AssetImage assetId={player.photoAssetId} alt={player.fullName} size={36} />
                        </td>
                        <td className={tableCellClass + ' text-white/40 font-mono'}>{player.number || '—'}</td>
                        <td className={tableCellClass + ' font-medium'}>{player.fullName}</td>
                        <td className={tableCellClass + ' text-white/50'}>{player.position}</td>
                        <td className={tableCellClass + ' text-white/40 font-mono'}>{player.bats}/{player.throws}</td>
                        <td className={tableCellClass}>
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${player.status === 'active' ? 'bg-emerald-400/15 text-emerald-300' : 'bg-white/10 text-white/40'}`}>
                            {player.status === 'active' ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Cuerpo Técnico ── */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-white/35">🧢 Cuerpo técnico</p>
              <button type="button" onClick={openNewStaff} className={primaryButtonClass}>+ Nuevo técnico</button>
            </div>

            {staff.length === 0 ? (
              <EmptyState message="Sin cuerpo técnico registrado." />
            ) : (
              <div className="rounded border border-white/10 overflow-hidden">
                <table className={tableClass}>
                  <thead>
                    <tr className={tableHeadRowClass}>
                      <th className={tableHeaderClass + ' w-8'}></th>
                      <th className={tableHeaderClass}>Nombre</th>
                      <th className={tableHeaderClass}>Rol</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {staff.map((member) => (
                      <tr
                        key={member.id}
                        className={tableRowClass}
                        style={staffDrawerOpen && staffForm.id === member.id ? selectedRowStyle : undefined}
                        onClick={(e) => openEditStaff(member, e.currentTarget as HTMLTableRowElement)}
                      >
                        <td className="p-2">
                          <AssetImage assetId={member.photoAssetId} alt={member.name} size={36} />
                        </td>
                        <td className={tableCellClass + ' font-medium'}>{member.name}</td>
                        <td className={tableCellClass + ' text-white/50'}>{member.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* Drawer jugador */}
      <SlideDrawer
        open={playerDrawerOpen}
        title={playerForm.id ? 'Editar jugador' : 'Nuevo jugador'}
        onClose={() => setPlayerDrawerOpen(false)}
        anchorRef={playerAnchor}
      >
        <div className="space-y-3 p-1">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Nombre completo">
              <input required className={fieldClass} value={playerForm.fullName}
                onChange={(e) => setPlayerForm((f) => ({ ...f, fullName: e.target.value }))} />
            </Field>
            <Field label="Apodo">
              <input className={fieldClass} value={playerForm.nickname}
                onChange={(e) => setPlayerForm((f) => ({ ...f, nickname: e.target.value }))} />
            </Field>
            <Field label="Número">
              <input required className={fieldClass} value={playerForm.number}
                onChange={(e) => setPlayerForm((f) => ({ ...f, number: e.target.value }))} />
            </Field>
            <Field label="Posición">
              <SearchSelect options={positions.map((p) => ({ value: p, label: p }))}
                value={playerForm.position} onChange={(v) => setPlayerForm((f) => ({ ...f, position: v }))} />
            </Field>
            <Field label="Batea">
              <SearchSelect options={[{ value: 'L', label: 'L – Zurdo' }, { value: 'R', label: 'R – Derecho' }, { value: 'S', label: 'S – Switch' }]}
                value={playerForm.bats ?? ''} onChange={(v) => setPlayerForm((f) => ({ ...f, bats: v as Player['bats'] }))} />
            </Field>
            <Field label="Lanza">
              <SearchSelect options={[{ value: 'L', label: 'L – Zurdo' }, { value: 'R', label: 'R – Derecho' }]}
                value={playerForm.throws ?? ''} onChange={(v) => setPlayerForm((f) => ({ ...f, throws: v as Player['throws'] }))} />
            </Field>
            <Field label="Nacimiento">
              <input type="date" className={fieldClass} value={playerForm.birthDate}
                onChange={(e) => setPlayerForm((f) => ({ ...f, birthDate: e.target.value }))} />
            </Field>
            <Field label="Nacionalidad">
              <input className={fieldClass} value={playerForm.nationality}
                onChange={(e) => setPlayerForm((f) => ({ ...f, nationality: e.target.value }))} />
            </Field>
            <Field label="Estado">
              <SearchSelect options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]}
                value={playerForm.status ?? 'active'} onChange={(v) => setPlayerForm((f) => ({ ...f, status: v as Player['status'] }))} />
            </Field>
            <div className="col-span-2">
              <Field label="Foto (assetId)">
                <div className="flex items-center gap-3">
                  <input className={`${fieldClass} flex-1`} value={playerForm.photoAssetId}
                    onChange={(e) => setPlayerForm((f) => ({ ...f, photoAssetId: e.target.value }))}
                    placeholder="Ej: photo-player-001.jpg" />
                  {playerForm.photoAssetId && (
                    <AssetImage assetId={playerForm.photoAssetId} alt="Vista previa" size={52} />
                  )}
                </div>
              </Field>
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void savePlayer(); }} disabled={saving || !selectedTeamId} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {playerForm.id && (
              <button type="button" onClick={() => { const p = players.find((x) => x.id === playerForm.id); if (p) confirmDeletePlayer(p); }} className={dangerButtonClass}>
                Eliminar
              </button>
            )}
            <button type="button" onClick={() => setPlayerDrawerOpen(false)} className={secondaryButtonClass}>Cancelar</button>
          </div>
        </div>
      </SlideDrawer>

      {/* Drawer staff */}
      <SlideDrawer
        open={staffDrawerOpen}
        title={staffForm.id ? 'Editar técnico' : 'Nuevo técnico'}
        onClose={() => setStaffDrawerOpen(false)}
        anchorRef={staffAnchor}
      >
        <div className="space-y-3 p-1">
          <Field label="Nombre">
            <input required className={fieldClass} value={staffForm.name}
              onChange={(e) => setStaffForm((f) => ({ ...f, name: e.target.value }))} />
          </Field>
          <Field label="Número (dorsal)">
            <input className={fieldClass} value={staffForm.number ?? ''}
              onChange={(e) => setStaffForm((f) => ({ ...f, number: e.target.value }))} />
          </Field>
          <Field label="Rol">
            <SearchSelect
              options={staffRoles.map((r) => ({ value: r, label: r }))}
              value={staffForm.role}
              onChange={(v) => setStaffForm((f) => ({ ...f, role: v as StaffRole }))}
            />
          </Field>
          <Field label="Foto (assetId)">
            <div className="flex items-center gap-3">
              <input className={`${fieldClass} flex-1`} value={staffForm.photoAssetId}
                onChange={(e) => setStaffForm((f) => ({ ...f, photoAssetId: e.target.value }))}
                placeholder="Ej: photo-staff-001.jpg" />
              {staffForm.photoAssetId && (
                <AssetImage assetId={staffForm.photoAssetId} alt="Vista previa" size={52} />
              )}
            </div>
          </Field>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => { void saveStaff(); }} disabled={saving || !selectedTeamId} className={primaryButtonClass}>
              {saved ? '✅ Guardado' : saving ? 'Guardando…' : 'Guardar'}
            </button>
            {staffForm.id && (
              <button type="button" onClick={() => { const s = staff.find((x) => x.id === staffForm.id); if (s) confirmDeleteStaff(s); }} className={dangerButtonClass}>
                Eliminar
              </button>
            )}
            <button type="button" onClick={() => setStaffDrawerOpen(false)} className={secondaryButtonClass}>Cancelar</button>
          </div>
        </div>
      </SlideDrawer>

      <ConfirmDialog state={dialog} onClose={() => setDialog(null)} />
    </div>
  );
}
