import React, { useState, useEffect, useRef, useCallback } from 'react';
import { UserPlus, ChevronLeft, ChevronRight, Search, X } from 'lucide-react';
import { useAdmin, type AdminUser, type UserListParams } from '../../../hooks/useAdmin';
import { useAuth } from '../../auth/SecurityContextProvider';
import { formatDateTimeInTimeZone } from '../../../utils/datetime';
import { SlideDrawer } from '../../../components/data/SlideDrawer';
import { StepUpModal } from '../../auth/StepUpModal';
import { normalizeAdminSearchTerm } from '../utils/search';

type User = AdminUser;

interface UsersTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

type UserRole = 'SysAdmin' | 'Admin' | 'Operator';
type UserStatusTarget = 'active' | 'suspended';
type RoleResourceType = 'Platform' | 'Tournament' | 'Team';

const PAGE_SIZE = 50;

const UsersTab: React.FC<UsersTabProps> = ({ onNotify, setLoading }) => {
  const admin = useAdmin();
  const { timeZone, getAccessToken, setStepUpToken, setStepUpAt } = useAuth();

  // ── List state ─────────────────────────────────────────────
  const [users, setUsers]         = useState<User[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pages, setPages]         = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]       = useState('');           // debounced
  const [filterStatus, setFilterStatus] = useState<UserListParams['status']>('');
  const [filterRole, setFilterRole]     = useState<UserListParams['role']>('');
  const [filterMfa, setFilterMfa]       = useState<UserListParams['mfa']>('');
  const [sortBy, setSortBy]       = useState<UserListParams['sortBy']>('created_at');
  const [sortDir, setSortDir]     = useState<UserListParams['sortDir']>('desc');

  // ── Invite ─────────────────────────────────────────────────
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail]       = useState('');

  // ── Drawer / form ──────────────────────────────────────────
  const [drawerOpen, setDrawerOpen]     = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formRole, setFormRole]         = useState<UserRole | ''>('');
  const [formRoleResourceType, setFormRoleResourceType] = useState<RoleResourceType>('Platform');
  const [formRoleResourceId, setFormRoleResourceId] = useState('global');
  const [formTargetStatus, setFormTargetStatus] = useState<UserStatusTarget>('active');
  const [formReason, setFormReason]     = useState('');
  const [formDeleteRequested, setFormDeleteRequested]         = useState(false);
  const [formDeleteConfirmationName, setFormDeleteConfirmationName] = useState('');

  // ── Step-up ────────────────────────────────────────────────
  const [stepUpModalOpen, setStepUpModalOpen]   = useState(false);
  const [stepUpChallengeId, setStepUpChallengeId] = useState<string | null>(null);
  const [stepUpMethod, setStepUpMethod]           = useState<'otp' | 'totp'>('otp');

  // ── Debounce search (400 ms) ────────────────────────────────
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchInput = (value: string) => {
    setSearchInput(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(normalizeAdminSearchTerm(value));
      setPage(1);
    }, 400);
  };
  const clearSearch = () => {
    setSearchInput('');
    setSearch('');
    setPage(1);
  };

  const requestDeleteStepUpChallenge = async (userId: string, accessToken: string) => {
    const challengeResponse = await fetch('/api/security/step-up/request', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        action: 'delete_user',
        resourceType: 'User',
        resourceId: userId,
      }),
    });

    const challengeData = await challengeResponse.json().catch(() => ({}));
    if (!challengeResponse.ok || !challengeData.challengeId) {
      const detail =
        challengeData?.error?.message ||
        challengeData?.message ||
        (challengeResponse.status === 401 ? 'Tu sesión expiró. Inicia sesión de nuevo.' : '');
      throw new Error(detail || 'No fue posible iniciar la re-verificación.');
    }

    setStepUpMethod(challengeData.method === 'totp' ? 'totp' : 'otp');
    setStepUpChallengeId(challengeData.challengeId);
    setStepUpModalOpen(true);
  };

  const loadUsers = useCallback(async (overridePage?: number) => {
    setLoading(true);
    try {
      const result = await admin.getUsers({
        page: overridePage ?? page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: filterStatus || undefined,
        role: filterRole || undefined,
        mfa: filterMfa || undefined,
        sortBy,
        sortDir,
      });
      setUsers(result.users);
      setTotal(result.total);
      setPages(result.pages);
    } catch (error) {
      onNotify('error', 'Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterStatus, filterRole, filterMfa, sortBy, sortDir]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const changePage = (next: number) => {
    setPage(next);
  };

  const handleInviteUser = async () => {
    if (!inviteEmail.trim()) {
      onNotify('error', 'Email requerido');
      return;
    }

    setLoading(true);
    try {
      await admin.inviteUser(inviteEmail);
      onNotify('success', `Usuario ${inviteEmail} invitado exitosamente`);
      setInviteEmail('');
      setShowInviteForm(false);
      await loadUsers();
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al invitar usuario');
    } finally {
      setLoading(false);
    }
  };

  const openUserDialog = (user: User) => {
    const fullName = `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim();
    setSelectedUser(user);
    setFormDisplayName(fullName);
    setFormRole((user.role as UserRole | null) ?? '');
    setFormRoleResourceType('Platform');
    setFormRoleResourceId('global');
    setFormTargetStatus(user.status === 'suspended' ? 'suspended' : 'active');
    setFormReason('');
    setFormDeleteRequested(false);
    setFormDeleteConfirmationName('');
    setSelectedUserId(user.id);
    setDrawerOpen(true);
  };

  const closeUserDialog = () => {
    setDrawerOpen(false);
    setSelectedUser(null);
    setSelectedUserId(null);
    setStepUpModalOpen(false);
    setStepUpChallengeId(null);
    setStepUpMethod('otp');
    setFormDeleteConfirmationName('');
  };

  const handleApplyUserChanges = async () => {
    if (!selectedUser) return;
    const normalizedReason = formReason.trim();
    const originalName = `${selectedUser.firstName ?? ''} ${selectedUser.lastName ?? ''}`.trim();

    if (formDeleteRequested && !normalizedReason) {
      onNotify('error', 'Debes indicar motivo para eliminar');
      return;
    }
    if (formDeleteRequested) {
      const expectedName = `${selectedUser.firstName ?? ''} ${selectedUser.lastName ?? ''}`.trim() || selectedUser.email;
      if (formDeleteConfirmationName.trim() !== expectedName) {
        onNotify('error', `Para eliminar, escribe exactamente: ${expectedName}`);
        return;
      }
    }
    if (!formDeleteRequested && formTargetStatus === 'suspended' && selectedUser.status !== 'suspended' && !normalizedReason) {
      onNotify('error', 'Debes indicar motivo para suspensión');
      return;
    }

    setLoading(true);
    try {
      if (formDeleteRequested) {
        const accessToken = getAccessToken();
        if (!accessToken) {
          throw new Error('Debes iniciar sesión nuevamente para continuar.');
        }

        try {
          await admin.deleteUser(selectedUser.id, {
            reason: normalizedReason,
            confirmationName: formDeleteConfirmationName.trim(),
          });
          onNotify('success', 'Usuario eliminado');
          closeUserDialog();
          await loadUsers();
        } catch (deleteError) {
          if ((deleteError as { code?: string })?.code !== 'STEP_UP_REQUIRED') {
            throw deleteError;
          }
          await requestDeleteStepUpChallenge(selectedUser.id, accessToken);
        }
        return;
      }

      let changes = 0;

      if (formDisplayName.trim() && formDisplayName.trim() !== originalName) {
        await admin.updateUserDisplayName(selectedUser.id, formDisplayName.trim());
        changes += 1;
      }

      const normalizedRoleScopeId =
        formRoleResourceType === 'Platform'
          ? (formRoleResourceId.trim() || 'global')
          : formRoleResourceId.trim();

      if (formRole && (formRole !== selectedUser.role || formRoleResourceType !== 'Platform' || normalizedRoleScopeId !== 'global')) {
        if ((formRoleResourceType === 'Tournament' || formRoleResourceType === 'Team') && !normalizedRoleScopeId) {
          onNotify('error', 'Debes indicar el ID del scope para Team/Tournament');
          return;
        }
        await admin.assignUserRole(selectedUser.id, {
          role: formRole,
          resourceType: formRoleResourceType,
          resourceId: normalizedRoleScopeId,
        });
        changes += 1;
      }

      const currentStatus = selectedUser.status === 'suspended' ? 'suspended' : 'active';
      if (formTargetStatus !== currentStatus) {
        if (formTargetStatus === 'suspended') {
          await admin.suspendUser(selectedUser.id, normalizedReason || 'admin_panel_update');
        } else {
          await admin.reactivateUser(selectedUser.id);
        }
        changes += 1;
      }

      if (changes === 0) {
        onNotify('info', 'No hay cambios para guardar');
      } else {
        onNotify('success', `Cambios aplicados (${changes})`);
      }
      closeUserDialog();
      await loadUsers();
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al actualizar usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyDeleteStepUp = async (code: string) => {
    if (!selectedUser) {
      throw new Error('No hay usuario seleccionado.');
    }
    if (!stepUpChallengeId) {
      throw new Error('No hay desafío de re-verificación activo.');
    }

    const accessToken = getAccessToken();
    if (!accessToken) {
      throw new Error('Debes iniciar sesión nuevamente para continuar.');
    }

    const verifyResponse = await fetch('/api/security/step-up/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        challengeId: stepUpChallengeId,
        code,
      }),
    });

    const verifyData = await verifyResponse.json().catch(() => ({}));
    if (!verifyResponse.ok || !verifyData.stepUpToken) {
      throw new Error(verifyData?.error?.message || verifyData?.message || 'Código inválido.');
    }

    const stepUpToken = verifyData.stepUpToken as string;
    setStepUpToken(stepUpToken);
    setStepUpAt(Date.now());

    setLoading(true);
    try {
      await admin.deleteUser(
        selectedUser.id,
        {
          reason: formReason.trim(),
          confirmationName: formDeleteConfirmationName.trim(),
        },
        { stepUpToken },
      );
      onNotify('success', 'Usuario eliminado');
      setStepUpModalOpen(false);
      setStepUpChallengeId(null);
      closeUserDialog();
      await loadUsers();
    } catch (error) {
      throw error instanceof Error ? error : new Error('No fue posible eliminar el usuario.');
    } finally {
      setLoading(false);
    }
  };

  // filteredUsers = server already filtered; use `users` directly
  const activeUsers    = users.filter((u) => u.status === 'active').length;
  const suspendedUsers = users.filter((u) => u.status === 'suspended').length;

  return (
    <div className="flex flex-col h-full min-h-0 gap-4">
      {/* Invite User Form */}
      {showInviteForm && (
        <div className="bg-slate-700/50 border border-slate-600 rounded-lg p-6 space-y-4">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Invitar Nuevo Usuario
          </h3>
          <div className="flex gap-2">
            <input
              type="email"
              placeholder="Email del nuevo usuario..."
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="flex-1 bg-slate-600 border border-slate-500 rounded px-4 py-2 text-white placeholder-slate-400"
            />
            <button
              onClick={handleInviteUser}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white font-semibold"
            >
              Invitar
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              className="px-6 py-2 bg-slate-600 hover:bg-slate-500 rounded text-white"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* ── Toolbar: search + filters + invite ── */}
      <div className="flex flex-wrap gap-2 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por email o nombre…"
            value={searchInput}
            onChange={(e) => handleSearchInput(e.target.value)}
            className="w-full bg-slate-700 border border-slate-600 rounded px-9 py-2 text-white placeholder-slate-400 text-sm"
          />
          {searchInput && (
            <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value as UserListParams['status']); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">Estado: Todos</option>
          <option value="active">Activo</option>
          <option value="suspended">Suspendido</option>
          <option value="inactive">Inactivo</option>
        </select>

        {/* Role filter */}
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value as UserListParams['role']); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">Rol: Todos</option>
          <option value="SysAdmin">SysAdmin</option>
          <option value="Admin">Admin</option>
          <option value="Operator">Operator</option>
          <option value="none">Sin rol</option>
        </select>

        {/* MFA filter */}
        <select
          value={filterMfa}
          onChange={(e) => { setFilterMfa(e.target.value as UserListParams['mfa']); setPage(1); }}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="">MFA: Todos</option>
          <option value="enabled">MFA activo</option>
          <option value="disabled">Sin MFA</option>
        </select>

        {/* Sort */}
        <select
          value={`${sortBy}:${sortDir}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split(':') as [UserListParams['sortBy'], UserListParams['sortDir']];
            setSortBy(col);
            setSortDir(dir);
            setPage(1);
          }}
          className="bg-slate-700 border border-slate-600 rounded px-3 py-2 text-sm text-white"
        >
          <option value="created_at:desc">Más recientes</option>
          <option value="created_at:asc">Más antiguos</option>
          <option value="email:asc">Email A→Z</option>
          <option value="email:desc">Email Z→A</option>
          <option value="display_name:asc">Nombre A→Z</option>
          <option value="last_login_at:desc">Último login</option>
        </select>

        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="ml-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-semibold flex items-center gap-2 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Invitar
        </button>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3 shrink-0">
        <div className="rounded-lg border border-slate-600 bg-slate-800/40 p-3">
          <p className="text-xs text-slate-400">Total (filtrado)</p>
          <p className="text-xl font-semibold text-white">{total}</p>
        </div>
        <div className="rounded-lg border border-emerald-800/60 bg-emerald-900/10 p-3">
          <p className="text-xs text-emerald-300/80">Activos (página)</p>
          <p className="text-xl font-semibold text-emerald-300">{activeUsers}</p>
        </div>
        <div className="rounded-lg border border-red-800/60 bg-red-900/10 p-3">
          <p className="text-xs text-red-300/80">Suspendidos (página)</p>
          <p className="text-xl font-semibold text-red-300">{suspendedUsers}</p>
        </div>
      </div>

      {/* ── Table — fixed height scrollable area ── */}
      <div className="flex flex-col flex-1 min-h-0 border border-slate-600 rounded-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full">
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-700 border-b border-slate-600">
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Nombre</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">MFA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wide">Último Login</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  onClick={() => openUserDialog(user)}
                  className={`border-b border-slate-700/60 hover:bg-slate-600/20 cursor-pointer transition-colors ${
                    selectedUserId === user.id ? 'bg-slate-700/30' : ''
                  }`}
                >
                  <td className={`px-4 py-2.5 text-sm text-white font-medium border-l-4 ${
                    selectedUserId === user.id ? 'border-blue-500' : 'border-transparent'
                  }`}>
                    {`${user.firstName ?? ''} ${user.lastName ?? ''}`.trim() || 'Sin nombre'}
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    <p className="text-white">{user.email}</p>
                    <p className="text-xs text-slate-500 font-mono">{user.id}</p>
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${
                      user.status === 'active' ? 'bg-emerald-900/30 text-emerald-300' : 'bg-red-900/30 text-red-300'
                    }`}>
                      {user.status === 'active' ? 'Activo' : 'Suspendido'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded ${
                      user.role === 'SysAdmin' ? 'bg-red-900/30 text-red-300' :
                      user.role === 'Admin'    ? 'bg-orange-900/30 text-orange-300' :
                      user.role === 'Operator' ? 'bg-blue-900/30 text-blue-300' :
                      'bg-slate-700/30 text-slate-400'
                    }`}>
                      {user.role || 'Sin rol'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      user.mfaEnabled ? 'bg-emerald-900/20 text-emerald-400' : 'text-slate-500'
                    }`}>
                      {user.mfaEnabled ? '✓ MFA' : '—'}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-sm text-slate-300">
                    {user.lastLogin ? formatDateTimeInTimeZone(user.lastLogin, timeZone) : 'Nunca'}
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400 text-sm">
                    No se encontraron usuarios con los filtros aplicados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination bar (fixed footer of table card) ── */}
        <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-slate-800 border-t border-slate-700 text-xs text-slate-400">
          <span>
            {total === 0 ? 'Sin resultados' : `Página ${page} de ${pages} · ${total} usuario${total !== 1 ? 's' : ''}`}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => changePage(1)}
              disabled={page <= 1}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >«</button>
            <button
              onClick={() => changePage(page - 1)}
              disabled={page <= 1}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronLeft className="w-4 h-4" /></button>
            {/* Page numbers window */}
            {Array.from({ length: Math.min(5, pages) }, (_, i) => {
              const start = Math.max(1, Math.min(page - 2, pages - 4));
              const p = start + i;
              return (
                <button
                  key={p}
                  onClick={() => changePage(p)}
                  className={`w-7 h-7 rounded text-xs ${p === page ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'}`}
                >{p}</button>
              );
            })}
            <button
              onClick={() => changePage(page + 1)}
              disabled={page >= pages}
              className="p-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            ><ChevronRight className="w-4 h-4" /></button>
            <button
              onClick={() => changePage(pages)}
              disabled={page >= pages}
              className="px-2 py-1 rounded hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed"
            >»</button>
          </div>
        </div>
      </div>

      {drawerOpen && selectedUser && (
        <SlideDrawer
          open
          title={`Gestión de usuario · ${selectedUser.email}`}
          onClose={closeUserDialog}
        >
          <div className="space-y-6">
            <div className="rounded-lg border border-slate-600 bg-slate-800/30 p-4">
              <p className="text-xs text-slate-400">ID</p>
              <p className="text-xs font-mono text-slate-200 mb-3">{selectedUser.id}</p>
              <p className="text-xs text-slate-400">Último login</p>
              <p className="text-sm text-slate-200">
                {selectedUser.lastLogin ? formatDateTimeInTimeZone(selectedUser.lastLogin, timeZone) : 'Nunca'}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Nombre visible</label>
              <input
                type="text"
                value={formDisplayName}
                onChange={(e) => setFormDisplayName(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder="Nombre del usuario"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Rol</label>
              <select
                value={formRole}
                onChange={(e) => setFormRole(e.target.value as UserRole | '')}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="">Sin cambio</option>
                <option value="Operator">Operator</option>
                <option value="Admin">Admin</option>
                <option value="SysAdmin">SysAdmin</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Ámbito del rol</label>
              <select
                value={formRoleResourceType}
                onChange={(e) => {
                  const next = e.target.value as RoleResourceType;
                  setFormRoleResourceType(next);
                  if (next === 'Platform') {
                    setFormRoleResourceId('global');
                  } else if (formRoleResourceId === 'global') {
                    setFormRoleResourceId('');
                  }
                }}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
              >
                <option value="Platform">Global (Platform)</option>
                <option value="Tournament">Liga/Torneo (Tournament)</option>
                <option value="Team">Equipo (Team)</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">ID del ámbito</label>
              <input
                type="text"
                value={formRoleResourceId}
                onChange={(e) => setFormRoleResourceId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder={formRoleResourceType === 'Platform' ? 'global' : 'ej: tor_2026 / team_abc'}
                disabled={formRoleResourceType === 'Platform'}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Estado</label>
              <select
                value={formTargetStatus}
                onChange={(e) => setFormTargetStatus(e.target.value as UserStatusTarget)}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                disabled={formDeleteRequested}
              >
                <option value="active">Activo</option>
                <option value="suspended">Suspendido</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">Motivo de la acción</label>
              <textarea
                value={formReason}
                onChange={(e) => setFormReason(e.target.value)}
                rows={3}
                className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white"
                placeholder="Describe el motivo operativo"
              />
            </div>

            <label className="flex items-center gap-2 rounded border border-rose-800/60 bg-rose-900/10 p-3 text-sm text-rose-200">
              <input
                type="checkbox"
                checked={formDeleteRequested}
                onChange={(e) => {
                  setFormDeleteRequested(e.target.checked);
                  if (!e.target.checked) setFormDeleteConfirmationName('');
                }}
                className="h-4 w-4"
              />
              Marcar para eliminar usuario (acción irreversible)
            </label>

            {formDeleteRequested && (
              <div className="space-y-2">
                <label className="text-sm text-rose-200">
                  Escribe el nombre para confirmar eliminación:
                  <span className="ml-1 font-semibold">
                    {`${selectedUser.firstName ?? ''} ${selectedUser.lastName ?? ''}`.trim() || selectedUser.email}
                  </span>
                </label>
                <input
                  type="text"
                  value={formDeleteConfirmationName}
                  onChange={(e) => setFormDeleteConfirmationName(e.target.value)}
                  className="w-full bg-slate-700 border border-rose-700/60 rounded px-3 py-2 text-white"
                  placeholder="Confirmación por nombre"
                />
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={closeUserDialog}
                className="px-4 py-2 rounded bg-slate-700 hover:bg-slate-600 text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleApplyUserChanges}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              >
                {formDeleteRequested ? 'Eliminar usuario' : 'Guardar cambios'}
              </button>
            </div>
          </div>
        </SlideDrawer>
      )}

      <StepUpModal
        isOpen={drawerOpen && stepUpModalOpen && Boolean(selectedUser) && Boolean(stepUpChallengeId)}
        onClose={() => {
          setStepUpModalOpen(false);
          setStepUpChallengeId(null);
          setStepUpMethod('otp');
        }}
        onVerify={handleVerifyDeleteStepUp}
        actionDescription="eliminar usuario"
        verificationMethod={stepUpMethod}
      />
    </div>
  );
};

export default UsersTab;
