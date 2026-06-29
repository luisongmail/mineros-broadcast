import React, { useState, useEffect } from 'react';
import { Shield, UserMinus, UserCheck, UserPlus } from 'lucide-react';
import { useAdmin, type AdminUser } from '../../../hooks/useAdmin';

interface User extends AdminUser {
  role?: string | null;
}

interface UsersTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ onNotify, setLoading }) => {
  const admin = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [selectedUserForRole, setSelectedUserForRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<'SysAdmin' | 'Admin' | 'Operator'>('Operator');

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await admin.getUsers();
      
      // Fetch roles for each user
      const usersWithRoles = await Promise.all(
        result.map(async (user) => {
          const roleResult = await admin.getUserRole(user.id);
          return { ...user, role: roleResult?.role || null };
        }),
      );
      
      // Apply filter
      const filtered = usersWithRoles.filter(
        (user) => filter === 'all' || user.status === filter,
      );
      
      setUsers(filtered);
    } catch (error) {
      onNotify('error', 'Error al cargar usuarios');
      console.error(error);
    } finally {
      setLoading(false);
    }
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

  const handleAssignRole = async (userId: string) => {
    if (!selectedRole) {
      onNotify('error', 'Rol requerido');
      return;
    }

    setLoading(true);
    try {
      await admin.assignUserRole(userId, selectedRole);
      onNotify('success', `Rol '${selectedRole}' asignado a usuario`);
      setSelectedUserForRole(null);
      await loadUsers();
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al asignar rol');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!window.confirm('¿Suspender este usuario?')) return;

    setLoading(true);
    try {
      await admin.suspendUser(userId, 'admin_action');
      onNotify('success', 'Usuario suspendido');
      await loadUsers();
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al suspender usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!window.confirm('¿Reactivar este usuario?')) return;

    setLoading(true);
    try {
      await admin.reactivateUser(userId);
      onNotify('success', 'Usuario reactivado');
      await loadUsers();
    } catch (error) {
      onNotify('error', (error as any).message || 'Error al reactivar usuario');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesFilter = filter === 'all' || user.status === filter;
    const matchesSearch = user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
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

      {/* Filter, Search and Action Buttons */}
      <div className="flex flex-col md:flex-row gap-4 items-center">
        <input
          type="text"
          placeholder="Buscar por email o ID..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-slate-700 border border-slate-600 rounded px-4 py-2 text-white placeholder-slate-400"
        />
        <div className="flex gap-2">
          {['all', 'active', 'suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === status
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-600/30 text-slate-300 hover:bg-slate-600/50'
              }`}
            >
              {status === 'all' ? 'Todos' : status === 'active' ? 'Activos' : 'Suspendidos'}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-white font-semibold flex items-center gap-2"
        >
          <UserPlus className="w-4 h-4" />
          Invitar
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-slate-600 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-600/50 border-b border-slate-600">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">ID Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Rol</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">MFA</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Último Login</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="border-b border-slate-600 hover:bg-slate-600/20">
                <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{user.id}</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${
                      user.status === 'active'
                        ? 'bg-emerald-900/30 text-emerald-300'
                        : 'bg-red-900/30 text-red-300'
                    }`}
                  >
                    {user.status === 'active' ? 'Activo' : 'Suspendido'}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm">
                  {selectedUserForRole === user.id ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value as any)}
                        className="bg-slate-600 border border-slate-500 rounded px-2 py-1 text-white text-xs"
                      >
                        <option value="Operator">Operator</option>
                        <option value="Admin">Admin</option>
                        <option value="SysAdmin">SysAdmin</option>
                      </select>
                      <button
                        onClick={() => handleAssignRole(user.id)}
                        className="px-2 py-1 bg-blue-600 hover:bg-blue-700 rounded text-white text-xs"
                      >
                        ✓
                      </button>
                      <button
                        onClick={() => setSelectedUserForRole(null)}
                        className="px-2 py-1 bg-slate-600 hover:bg-slate-500 rounded text-white text-xs"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        user.role === 'SysAdmin' ? 'bg-red-900/30 text-red-300' :
                        user.role === 'Admin' ? 'bg-orange-900/30 text-orange-300' :
                        user.role === 'Operator' ? 'bg-blue-900/30 text-blue-300' :
                        'bg-slate-700/30 text-slate-400'
                      }`}>
                        {user.role || 'Sin rol'}
                      </span>
                      <button
                        onClick={() => setSelectedUserForRole(user.id)}
                        className="text-slate-400 hover:text-white text-xs"
                        title="Cambiar rol"
                      >
                        ✎
                      </button>
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {user.mfaEnabled ? (
                    <span className="flex items-center gap-1 text-emerald-400">
                      <Shield className="w-4 h-4" />
                      Configurado
                    </span>
                  ) : (
                    <span className="text-yellow-400">No configurado</span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-slate-300">
                  {user.lastLogin ? new Date(user.lastLogin).toLocaleString('es-CL') : 'Nunca'}
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  {user.status === 'active' ? (
                    <button
                      onClick={() => handleSuspendUser(user.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm"
                    >
                      <UserMinus className="w-4 h-4" />
                      Suspender
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateUser(user.id)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-emerald-900/30 hover:bg-emerald-900/50 text-emerald-300 text-sm"
                    >
                      <UserCheck className="w-4 h-4" />
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No se encontraron usuarios</p>
        </div>
      )}
    </div>
  );
};

export default UsersTab;
