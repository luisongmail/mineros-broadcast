import React, { useState, useEffect } from 'react';
import { LogOut, AlertCircle } from 'lucide-react';

interface Session {
  sessionId: string;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  ipAddress: string;
  userAgent: string;
  lastActivity: Date;
}

interface SessionsTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const SessionsTab: React.FC<SessionsTabProps> = ({ onNotify, setLoading }) => {
  const [sessions, setSessions] = useState<Session[]>([]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    setLoading(true);
    try {
      // Mock sessions data
      setSessions([
        {
          sessionId: 'sess_001',
          userId: 'usr_001',
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
          expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000),
          ipAddress: '192.168.1.100',
          userAgent: 'Chrome/120.0 (macOS)',
          lastActivity: new Date(Date.now() - 5 * 60 * 1000),
        },
        {
          sessionId: 'sess_002',
          userId: 'usr_002',
          createdAt: new Date(Date.now() - 30 * 60 * 1000),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          ipAddress: '192.168.1.50',
          userAgent: 'Safari/17.0 (macOS)',
          lastActivity: new Date(),
        },
      ]);
    } catch (error) {
      onNotify('error', 'Error al cargar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateSession = async (sessionId: string) => {
    if (!window.confirm('¿Invalidar esta sesión? El usuario será desconectado.')) return;

    setLoading(true);
    try {
      const session = sessions.find((s) => s.sessionId === sessionId);
      if (!session) throw new Error('Session not found');

      const response = await fetch(`/api/admin/sessions/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          userId: session.userId,
          reason: 'admin_action',
        }),
      });

      if (!response.ok) throw new Error('Failed to invalidate session');

      setSessions((prev) => prev.filter((s) => s.sessionId !== sessionId));
      onNotify('success', 'Sesión invalidada');
    } catch (error) {
      onNotify('error', 'Error al invalidar sesión');
    } finally {
      setLoading(false);
    }
  };

  const handleInvalidateUserSessions = async (userId: string) => {
    const userSessions = sessions.filter((s) => s.userId === userId);
    if (!window.confirm(`¿Invalidar ${userSessions.length} sesión(es) del usuario?`)) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/admin/sessions/invalidate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason: 'admin_action',
        }),
      });

      if (!response.ok) throw new Error('Failed to invalidate sessions');

      setSessions((prev) => prev.filter((s) => s.userId !== userId));
      onNotify('success', `${userSessions.length} sesión(es) invalidada(s)`);
    } catch (error) {
      onNotify('error', 'Error al invalidar sesiones');
    } finally {
      setLoading(false);
    }
  };

  const isSessionExpired = (session: Session) => new Date() > session.expiresAt;

  return (
    <div className="space-y-6">
      <div className="bg-yellow-900/20 border border-yellow-700/50 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-yellow-300">Invalidación de Sesiones</p>
          <p className="text-sm text-yellow-200/80 mt-1">
            Invalidar una sesión desconectará al usuario inmediatamente.
          </p>
        </div>
      </div>

      {/* Sessions Table */}
      <div className="overflow-x-auto border border-slate-600 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-600/50 border-b border-slate-600">
              <th className="px-4 py-3 text-left font-semibold text-slate-300">ID Sesión</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Usuario</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">IP Address</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Navegador</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Última Actividad</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-300">Estado</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-300">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map((session) => (
              <tr key={session.sessionId} className="border-b border-slate-600 hover:bg-slate-600/20">
                <td className="px-4 py-3 text-slate-300 font-mono text-xs">{session.sessionId}</td>
                <td className="px-4 py-3 text-white">{session.userId}</td>
                <td className="px-4 py-3 text-slate-300">{session.ipAddress}</td>
                <td className="px-4 py-3 text-slate-300 text-xs truncate">{session.userAgent}</td>
                <td className="px-4 py-3 text-slate-400 text-xs">
                  {session.lastActivity.toLocaleString('es-CL')}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-semibold ${
                      isSessionExpired(session)
                        ? 'bg-emerald-900/30 text-emerald-300'
                        : 'bg-slate-900/30 text-slate-400'
                    }`}
                  >
                    {isSessionExpired(session) ? 'Activa' : 'Expirada'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => handleInvalidateSession(session.sessionId)}
                    disabled={isSessionExpired(session)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded bg-red-900/30 hover:bg-red-900/50 disabled:opacity-50 text-red-300 text-sm"
                  >
                    <LogOut className="w-4 h-4" />
                    Invalidar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const userIds = Array.from(new Set(sessions.map((s) => s.userId)));
            userIds.forEach((userId) => handleInvalidateUserSessions(userId));
          }}
          className="px-4 py-2 rounded-lg bg-red-900/30 hover:bg-red-900/50 text-red-300 font-semibold"
        >
          <LogOut className="w-4 h-4 inline mr-2" />
          Invalidar Todas las Sesiones
        </button>
      </div>

      {sessions.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          <p>No hay sesiones activas</p>
        </div>
      )}
    </div>
  );
};

export default SessionsTab;
