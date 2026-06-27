import React, { useState, useEffect } from 'react';
import { useAuth } from '../auth/SecurityContextProvider';

interface UserRow {
  userId: string;
  email: string;
  displayName: string | null;
  status: 'active' | 'suspended' | 'invited';
}

export function AdminUsersPage() {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);

  const fetchUsers = async () => {
    if (!accessToken) return;
    setLoading(true);
    try {
      const res = await fetch('/api/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('Sin permiso para ver usuarios');
      const data = (await res.json()) as { users: UserRow[] };
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void fetchUsers(); }, [accessToken]);

  async function inviteUser(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken || !inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email: inviteEmail }),
      });
      if (!res.ok) throw new Error('No se pudo invitar al usuario');
      setInviteEmail('');
      await fetchUsers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setInviting(false);
    }
  }

  async function suspendUser(userId: string) {
    if (!accessToken) return;
    const reason = window.prompt('Motivo de suspensión (requerido):');
    if (!reason) return;
    const res = await fetch(`/api/users/${userId}/suspend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) {
      const err = (await res.json()) as { error?: string };
      if (err.error === 'step_up_required') {
        alert('Se requiere step-up para suspender usuarios. Por favor recarga y verifica tu identidad.');
      }
    } else {
      await fetchUsers();
    }
  }

  async function reactivateUser(userId: string) {
    if (!accessToken) return;
    await fetch(`/api/users/${userId}/reactivate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    await fetchUsers();
  }

  if (loading) return <div className="p-6 text-gray-500">Cargando usuarios…</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Gestión de Usuarios</h1>

      {/* Invitar usuario */}
      <form onSubmit={(e) => void inviteUser(e)} className="mb-6 flex gap-2">
        <input
          type="email"
          value={inviteEmail}
          onChange={(e) => setInviteEmail(e.target.value)}
          placeholder="correo@ejemplo.com"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        />
        <button
          type="submit"
          disabled={inviting || !inviteEmail}
          className="rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
        >
          {inviting ? 'Invitando…' : 'Invitar'}
        </button>
      </form>

      {/* Tabla de usuarios */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Nombre</th>
              <th className="px-4 py-3 text-left font-medium text-gray-700">Estado</th>
              <th className="px-4 py-3 text-right font-medium text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.userId} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">{u.email}</td>
                <td className="px-4 py-3 text-gray-700">{u.displayName ?? '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      u.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : u.status === 'suspended'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {u.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {u.status === 'active' && (
                    <button
                      onClick={() => void suspendUser(u.userId)}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Suspender
                    </button>
                  )}
                  {u.status === 'suspended' && (
                    <button
                      onClick={() => void reactivateUser(u.userId)}
                      className="text-xs text-green-600 hover:underline"
                    >
                      Reactivar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
