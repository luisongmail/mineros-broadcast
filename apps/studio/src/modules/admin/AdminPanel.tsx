import React, { useCallback, useState } from 'react';
import {
  Settings,
  Users,
  History,
  LogOut,
  Heart,
  Download,
} from 'lucide-react';
import PolicyTab from './tabs/PolicyTab';
import UsersTab from './tabs/UsersTab';
import AuditTab from './tabs/AuditTab';
import SessionsTab from './tabs/SessionsTab';
import SystemHealthTab from './tabs/SystemHealthTab';
import { useAuth } from '../auth/SecurityContextProvider';

type AdminTab = 'policy' | 'users' | 'audit' | 'sessions' | 'system';

const AdminPanel: React.FC = () => {
  const { timeZone, setTimeZone } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('policy');
  const [loading, setLoading] = useState(false);
  const [auditExportHandler, setAuditExportHandler] = useState<(() => void) | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  }, []);

  const tabs = [
    { id: 'policy' as const, label: 'Políticas', icon: Settings },
    { id: 'users' as const, label: 'Usuarios', icon: Users },
    { id: 'audit' as const, label: 'Auditoría', icon: History },
    { id: 'sessions' as const, label: 'Sesiones', icon: LogOut },
    { id: 'system' as const, label: 'Sistema', icon: Heart },
  ];

  const tabHelp: Record<AdminTab, string> = {
    policy: 'Configura reglas de seguridad y acceso.',
    users: 'Gestiona usuarios y roles con acciones rápidas.',
    audit: 'Revisa actividad crítica y trazabilidad.',
    sessions: 'Controla sesiones activas y cierres remotos.',
    system: 'Monitorea salud técnica de la plataforma.',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <div className="mt-1 flex items-center justify-between gap-4">
            <p className="text-sm text-slate-400">Gestión de políticas, usuarios y auditoría</p>
            <div className="flex items-center gap-3">
              <a
                href="/settings/mfa"
                className="rounded border border-emerald-700/70 bg-emerald-900/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-900/30"
              >
                Configurar MFA
              </a>
              <label className="flex items-center gap-2 text-xs text-slate-300">
                Zona horaria
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  className="bg-slate-700 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/Santo_Domingo">America/Santo_Domingo</option>
                  <option value="America/Santiago">America/Santiago</option>
                  <option value="America/Mexico_City">America/Mexico_City</option>
                  <option value="Europe/Madrid">Europe/Madrid</option>
                </select>
              </label>
            </div>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`fixed top-4 right-4 px-4 py-3 rounded-lg text-white text-sm z-50 ${
            notification.type === 'success'
              ? 'bg-emerald-600'
              : notification.type === 'error'
                ? 'bg-red-600'
                : 'bg-blue-600'
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Main Content — flex column, fills viewport height */}
      <main className="max-w-7xl mx-auto px-6 py-8 flex flex-col" style={{ height: 'calc(100vh - 120px)' }}>
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-slate-700 overflow-x-auto shrink-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="mb-3 shrink-0 flex items-center justify-between gap-3">
          <p className="text-sm text-slate-400">{tabHelp[activeTab]}</p>
          <div className="flex items-center gap-2">
            {activeTab === 'sessions' && (
              <span className="rounded border border-yellow-700/60 bg-yellow-900/20 px-2.5 py-1 text-xs text-yellow-200">
                Invalidar una sesión desconecta al usuario inmediatamente
              </span>
            )}
            {activeTab === 'audit' && auditExportHandler && (
              <button
                onClick={auditExportHandler}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-600 text-white text-sm"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            )}
          </div>
        </div>

        {/* Tab Content — fills remaining height */}
        <div className="flex-1 min-h-0 bg-slate-700/30 rounded-xl border border-slate-600 p-6 backdrop-blur-sm overflow-hidden flex flex-col">
          {activeTab === 'policy' && (
            <PolicyTab onNotify={showNotification} setLoading={setLoading} />
          )}
          {activeTab === 'users' && (
            <UsersTab onNotify={showNotification} setLoading={setLoading} />
          )}
          {activeTab === 'audit' && (
            <AuditTab
              onNotify={showNotification}
              setLoading={setLoading}
              onRegisterExport={setAuditExportHandler}
            />
          )}
          {activeTab === 'sessions' && (
            <SessionsTab onNotify={showNotification} setLoading={setLoading} />
          )}
          {activeTab === 'system' && (
            <SystemHealthTab onNotify={showNotification} setLoading={setLoading} />
          )}
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-slate-800 rounded-lg p-6 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-3 border-slate-600 border-t-blue-500 rounded-full animate-spin" />
              <p className="text-slate-300">Procesando...</p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminPanel;
