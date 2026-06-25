import { useEffect, useMemo, useState } from 'react';

import { generateId, request, toErrorMessage } from './api';
import { mockPlayersByTeam, mockStaffByTeam, mockTeams } from './mockData';
import { SearchSelect } from './SearchSelect';
import { EmptyState, Feedback, Field, LoadingState, SectionCard, dangerButtonClass, fieldClass, primaryButtonClass, secondaryButtonClass, tableCellClass, tableHeaderClass } from './shared';
import { normalizePlayer, normalizeStaffMember, normalizeTeam, type Player, type StaffMember, type StaffRole, type Team } from './types';

const positions = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'UT', 'DH'] as const;
const staffRoles: StaffRole[] = ['manager', 'coach_bateo', 'coach_bases', 'pitcher_coach', 'utilero', 'otro'];

const emptyPlayer = (): Player => ({ id: '', fullName: '', nickname: '', number: '', position: 'UT', bats: 'R', throws: 'R', photoAssetId: '', birthDate: '', nationality: '', status: 'active' });
const emptyStaff = (): StaffMember => ({ id: '', name: '', role: 'manager', photoAssetId: '' });

export function RosterEditor() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [players, setPlayers] = useState<Player[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [playerForm, setPlayerForm] = useState<Player>(emptyPlayer());
  const [staffForm, setStaffForm] = useState<StaffMember>(emptyStaff());
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadTeams = async () => {
      setLoadingTeams(true);
      try {
        const payload = await request<unknown[]>('/api/teams');
        if (!cancelled) {
          const nextTeams = payload.map(normalizeTeam);
          setTeams(nextTeams);
          setSelectedTeamId((current) => current || nextTeams[0]?.id || '');
        }
      } catch (loadError) {
        if (!cancelled) {
          setTeams(mockTeams);
          setSelectedTeamId(mockTeams[0]?.id ?? '');
          setError(`${toErrorMessage(loadError, 'No se pudieron cargar los equipos.')} Mostrando datos mock.`);
        }
      } finally {
        if (!cancelled) setLoadingTeams(false);
      }
    };

    void loadTeams();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedTeamId) {
      setPlayers([]);
      setStaff([]);
      return;
    }

    let cancelled = false;

    const loadRoster = async () => {
      setLoadingRoster(true);
      setError(null);

      try {
        const [playersPayload, staffPayload] = await Promise.all([
          request<unknown[]>(`/api/teams/${selectedTeamId}/players`),
          request<unknown[]>(`/api/teams/${selectedTeamId}/staff`),
        ]);

        if (!cancelled) {
          setPlayers(playersPayload.map(normalizePlayer));
          setStaff(staffPayload.map(normalizeStaffMember));
        }
      } catch (loadError) {
        if (!cancelled) {
          setPlayers(mockPlayersByTeam[selectedTeamId] ?? []);
          setStaff(mockStaffByTeam[selectedTeamId] ?? []);
          setError(`${toErrorMessage(loadError, 'No se pudo cargar el roster.')} Mostrando datos mock.`);
        }
      } finally {
        if (!cancelled) setLoadingRoster(false);
      }
    };

    void loadRoster();
    return () => {
      cancelled = true;
    };
  }, [selectedTeamId]);

  const selectedTeamName = useMemo(() => teams.find((team) => team.id === selectedTeamId)?.shortName ?? 'Equipo', [teams, selectedTeamId]);

  const upsertPlayer = (entry: Player) => setPlayers((current) => (current.some((item) => item.id === entry.id) ? current.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...current]));
  const upsertStaff = (entry: StaffMember) => setStaff((current) => (current.some((item) => item.id === entry.id) ? current.map((item) => (item.id === entry.id ? entry : item)) : [entry, ...current]));

  const savePlayer = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeamId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const method = playerForm.id ? 'PUT' : 'POST';
      const path = playerForm.id ? `/api/teams/${selectedTeamId}/players/${playerForm.id}` : `/api/teams/${selectedTeamId}/players`;
      // Mapear camelCase → snake_case para el backend
      const playerPayload = {
        name:           playerForm.fullName,
        first_name:     playerForm.fullName.split(' ')[0] ?? '',
        last_name:      playerForm.fullName.split(' ').slice(1).join(' ') || null,
        nickname:       playerForm.nickname || null,
        number:         playerForm.number,
        position:       playerForm.position,
        bats:           playerForm.bats,
        throws:         playerForm.throws,
        photo_asset_id: playerForm.photoAssetId || null,
        date_of_birth:  playerForm.birthDate || null,
        nationality:    playerForm.nationality || 'DO',
        status:         playerForm.status,
      };
      const payload = normalizePlayer(await request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(playerPayload),
      }));
      upsertPlayer(payload);
      setMessage(`Jugador ${playerForm.id ? 'actualizado' : 'creado'} en ${selectedTeamName}.`);
    } catch (saveError) {
      const local = { ...playerForm, id: playerForm.id || generateId('player') };
      upsertPlayer(local);
      setError(toErrorMessage(saveError, 'No se pudo guardar el jugador.'));
      setMessage('Cambio de jugador aplicado localmente.');
    } finally {
      setSaving(false);
      setPlayerForm(emptyPlayer());
    }
  };

  const saveStaff = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTeamId) return;

    setSaving(true);
    setError(null);
    setMessage(null);

    try {
      const method = staffForm.id ? 'PUT' : 'POST';
      const path = staffForm.id ? `/api/teams/${selectedTeamId}/staff/${staffForm.id}` : `/api/teams/${selectedTeamId}/staff`;
      // Mapear camelCase → snake_case para el backend
      const staffPayload = {
        name:           staffForm.name,
        role:           staffForm.role,
        photo_asset_id: staffForm.photoAssetId || null,
        active:         true,
      };
      const payload = normalizeStaffMember(await request(path, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(staffPayload),
      }));
      upsertStaff(payload);
      setMessage(`Miembro del staff ${staffForm.id ? 'actualizado' : 'creado'}.`);
    } catch (saveError) {
      const local = { ...staffForm, id: staffForm.id || generateId('staff') };
      upsertStaff(local);
      setError(toErrorMessage(saveError, 'No se pudo guardar el staff.'));
      setMessage('Cambio de staff aplicado localmente.');
    } finally {
      setSaving(false);
      setStaffForm(emptyStaff());
    }
  };

  const deletePlayer = async (id: string) => {
    setPlayers((current) => current.filter((item) => item.id !== id));
    if (playerForm.id === id) setPlayerForm(emptyPlayer());

    try {
      await request(`/api/teams/${selectedTeamId}/players/${id}`, { method: 'DELETE' });
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar el jugador.')} Eliminado solo localmente.`);
    }
  };

  const deleteStaff = async (id: string) => {
    setStaff((current) => current.filter((item) => item.id !== id));
    if (staffForm.id === id) setStaffForm(emptyStaff());

    try {
      await request(`/api/teams/${selectedTeamId}/staff/${id}`, { method: 'DELETE' });
    } catch (deleteError) {
      setError(`${toErrorMessage(deleteError, 'No se pudo eliminar el staff.')} Eliminado solo localmente.`);
    }
  };

  if (loadingTeams) return <LoadingState message="Cargando equipos..." />;

  return (
    <div className="space-y-3">
      {error && <Feedback tone="error" message={error} />}
      {message && <Feedback tone="success" message={message} />}

      <SectionCard title="Equipo">
        <Field label="Selector de equipo">
          <SearchSelect
            options={teams.map((t) => ({ value: t.id, label: t.fullName, sublabel: t.shortName }))}
            value={selectedTeamId}
            onChange={setSelectedTeamId}
            placeholder="Seleccionar equipo…"
          />
        </Field>
      </SectionCard>

      {loadingRoster ? <LoadingState message="Cargando roster..." /> : (
        <>
          <SectionCard title={`Jugadores · ${selectedTeamName}`} actions={<button type="button" className={secondaryButtonClass} onClick={() => setPlayerForm(emptyPlayer())}>Nuevo</button>}>
            {players.length === 0 ? (
              <EmptyState message="No hay jugadores cargados." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className={tableHeaderClass}>#</th>
                      <th className={tableHeaderClass}>Nombre</th>
                      <th className={tableHeaderClass}>Pos</th>
                      <th className={tableHeaderClass}>B/L</th>
                      <th className={tableHeaderClass}>Estado</th>
                      <th className={tableHeaderClass}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {players.map((player) => (
                      <tr key={player.id}>
                        <td className={tableCellClass}>{player.number || '—'}</td>
                        <td className={tableCellClass}>{player.fullName}</td>
                        <td className={tableCellClass}>{player.position}</td>
                        <td className={tableCellClass}>{player.bats}/{player.throws}</td>
                        <td className={tableCellClass}>{player.status}</td>
                        <td className={tableCellClass}>
                          <div className="flex gap-2">
                            <button type="button" className={secondaryButtonClass} onClick={() => setPlayerForm(player)}>Editar</button>
                            <button type="button" className={dangerButtonClass} onClick={() => { void deletePlayer(player.id); }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title={playerForm.id ? 'Editar jugador' : 'Nuevo jugador'}>
            <form className="space-y-3" onSubmit={(event) => { void savePlayer(event); }}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nombre completo"><input required className={fieldClass} value={playerForm.fullName} onChange={(event) => setPlayerForm((current) => ({ ...current, fullName: event.target.value }))} /></Field>
                <Field label="Apodo"><input className={fieldClass} value={playerForm.nickname} onChange={(event) => setPlayerForm((current) => ({ ...current, nickname: event.target.value }))} /></Field>
                <Field label="Número"><input required className={fieldClass} value={playerForm.number} onChange={(event) => setPlayerForm((current) => ({ ...current, number: event.target.value }))} /></Field>
                <Field label="Posición"><SearchSelect options={positions.map((p) => ({ value: p, label: p }))} value={playerForm.position} onChange={(v) => setPlayerForm((c) => ({ ...c, position: v }))} /></Field>
                <Field label="Bats"><SearchSelect options={[{ value: 'L', label: 'L – Zurdo' }, { value: 'R', label: 'R – Derecho' }, { value: 'S', label: 'S – Switch' }]} value={playerForm.bats ?? ''} onChange={(v) => setPlayerForm((c) => ({ ...c, bats: v as Player['bats'] }))} placeholder="—" /></Field>
                <Field label="Throws"><SearchSelect options={[{ value: 'L', label: 'L – Zurdo' }, { value: 'R', label: 'R – Derecho' }, { value: 'S', label: 'S – Switch' }]} value={playerForm.throws ?? ''} onChange={(v) => setPlayerForm((c) => ({ ...c, throws: v as Player['throws'] }))} placeholder="—" /></Field>
                <Field label="Foto asset ID"><input className={fieldClass} placeholder="ej: teams/logo-mineros" value={playerForm.photoAssetId} onChange={(event) => setPlayerForm((current) => ({ ...current, photoAssetId: event.target.value }))} /></Field>
                <Field label="Fecha de nacimiento"><input className={fieldClass} type="date" value={playerForm.birthDate} onChange={(event) => setPlayerForm((current) => ({ ...current, birthDate: event.target.value }))} /></Field>
                <Field label="Nacionalidad"><input className={fieldClass} value={playerForm.nationality} onChange={(event) => setPlayerForm((current) => ({ ...current, nationality: event.target.value }))} /></Field>
                <Field label="Status"><SearchSelect options={[{ value: 'active', label: 'Activo' }, { value: 'inactive', label: 'Inactivo' }]} value={playerForm.status ?? 'active'} onChange={(v) => setPlayerForm((c) => ({ ...c, status: v as Player['status'] }))} /></Field>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !selectedTeamId} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" className={secondaryButtonClass} onClick={() => setPlayerForm(emptyPlayer())}>Cancelar</button>
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Cuerpo técnico" actions={<button type="button" className={secondaryButtonClass} onClick={() => setStaffForm(emptyStaff())}>Nuevo</button>}>
            {staff.length === 0 ? (
              <EmptyState message="No hay cuerpo técnico registrado." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-700">
                  <thead>
                    <tr>
                      <th className={tableHeaderClass}>Nombre</th>
                      <th className={tableHeaderClass}>Rol</th>
                      <th className={tableHeaderClass}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800">
                    {staff.map((member) => (
                      <tr key={member.id}>
                        <td className={tableCellClass}>{member.name}</td>
                        <td className={tableCellClass}>{member.role}</td>
                        <td className={tableCellClass}>
                          <div className="flex gap-2">
                            <button type="button" className={secondaryButtonClass} onClick={() => setStaffForm(member)}>Editar</button>
                            <button type="button" className={dangerButtonClass} onClick={() => { void deleteStaff(member.id); }}>Eliminar</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>

          <SectionCard title={staffForm.id ? 'Editar staff' : 'Nuevo staff'}>
            <form className="space-y-3" onSubmit={(event) => { void saveStaff(event); }}>
              <div className="grid gap-3 md:grid-cols-2">
                <Field label="Nombre"><input required className={fieldClass} value={staffForm.name} onChange={(event) => setStaffForm((current) => ({ ...current, name: event.target.value }))} /></Field>
                <Field label="Rol"><SearchSelect options={staffRoles.map((r) => ({ value: r, label: r }))} value={staffForm.role} onChange={(v) => setStaffForm((c) => ({ ...c, role: v as StaffRole }))} /></Field>
                <Field label="Foto asset ID"><input className={fieldClass} placeholder="ej: teams/logo-mineros" value={staffForm.photoAssetId} onChange={(event) => setStaffForm((current) => ({ ...current, photoAssetId: event.target.value }))} /></Field>
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={saving || !selectedTeamId} className={primaryButtonClass}>{saving ? 'Guardando...' : 'Guardar'}</button>
                <button type="button" className={secondaryButtonClass} onClick={() => setStaffForm(emptyStaff())}>Cancelar</button>
              </div>
            </form>
          </SectionCard>
        </>
      )}
    </div>
  );
}
