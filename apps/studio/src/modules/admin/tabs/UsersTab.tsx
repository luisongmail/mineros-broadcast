import React, { useState, useEffect } from 'react';
import { Shield, UserMinus, UserCheck } from 'lucide-react';

interface User {
  userId: string;
  email: string;
  status: 'active' | 'suspended';
  mfaSetup: boolean;
  lastLogin?: Date;
  createdAt: Date;
  suspendedAt?: Date;
  suspendedBy?: string;
}

interface UsersTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const UsersTab: React.FC<UsersTabProps> = ({ onNotify, setLoading }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadUsers();
  }, [filter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Mock data for now
      setUsers([
        {
          userId: 'usr_001',
          email: 'operator@mineros.cl',
          status: 'active',
          mfaSetup: true,
          lastLogin: new Date(),
          createdAt: new Date('2026-06-01'),
        },
        {
          userId: 'usr_002',
          email: 'admin@mineros.cl',
          status: 'active',
          mfaSetup: true,
          lastLogin: new Date(Date.now() - 2 * 60 * 60 * 1000),
          createdAt: new Date('2026-06-01'),
        },
        {
          userId: 'usr_003',
          email: 'suspended@mineros.cl',
          status: 'suspended',
          mfaSetup: false,
          suspendedAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
          suspendedBy: 'usr_admin_001',
          createdAt: new Date('2026-06-15'),
        },
      ]);
    } catch (error) {
      onNotify('error', 'Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const handleSuspendUser = async (userId: string) => {
    if (!window.confirm('¿Suspender este usuario?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/user/${userId}/suspend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin_action' }),
      });

      if (!response.ok) throw new Error('Failed to suspend user');

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId ? { ...u, status: 'suspended', suspendedAt: new Date() } : u,
        ),
      );
      onNotify('success', `Usuario ${userId} suspendido`);
    } catch (error) {
      onNotify('error', 'Error al suspender usuario');
    } finally {
      setLoading(false);
    }
  };

  const handleReactivateUser = async (userId: string) => {
    if (!window.confirm('¿Reactivar este usuario?')) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/user/${userId}/reactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'admin_action' }),
      });

      if (!response.ok) throw new Error('Failed to reactivate user');

      setUsers((prev) =>
        prev.map((u) =>
          u.userId === userId
            ? { ...u, status: 'active', suspendedAt: undefined, suspendedBy: undefined }
            : u,
        ),
      );
      onNotify('success', `Usuario ${userId} reactivado`);
    } catch (error) {
      onNotify('error', 'Error al reactivar usuario');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesFilter = filter === 'all' || user.status === filter;
    const matchesSearch =
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userId.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Filter and Search */}
      <div className="flex flex-col md:flex-row gap-4">
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
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto border border-slate-600 rounded-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-600/50 border-b border-slate-600">
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Email</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">ID Usuario</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Estado</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">MFA</th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-slate-300">Último Login</th>
              <th className="px-4 py-3 text-right text-sm font-semibold text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.userId} className="border-b border-slate-600 hover:bg-slate-600/20">
                <td className="px-4 py-3 text-sm text-white">{user.email}</td>
                <td className="px-4 py-3 text-sm text-slate-300">{user.userId}</td>
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
                <td className="px-4 py-3 text-sm text-slate-300">
                  {user.mfaSetup ? (
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
                      onClick={() => handleSuspendUser(user.userId)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 text-red-300 text-sm"
                    >
                      <UserMinus className="w-4 h-4" />
                      Suspender
                    </button>
                  ) : (
                    <button
                      onClick={() => handleReactivateUser(user.userId)}
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
