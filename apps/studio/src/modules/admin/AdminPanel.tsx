import React, { useState } from 'react';
import {
  Settings,
  Users,
  History,
  LogOut,
  Heart,
} from 'lucide-react';
import PolicyTab from './tabs/PolicyTab';
import UsersTab from './tabs/UsersTab';
import AuditTab from './tabs/AuditTab';
import SessionsTab from './tabs/SessionsTab';
import SystemHealthTab from './tabs/SystemHealthTab';

type AdminTab = 'policy' | 'users' | 'audit' | 'sessions' | 'system';

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AdminTab>('policy');
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const tabs = [
    { id: 'policy' as const, label: 'Políticas', icon: Settings },
    { id: 'users' as const, label: 'Usuarios', icon: Users },
    { id: 'audit' as const, label: 'Auditoría', icon: History },
    { id: 'sessions' as const, label: 'Sesiones', icon: LogOut },
    { id: 'system' as const, label: 'Sistema', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-white">Panel de Administración</h1>
          <p className="text-sm text-slate-400 mt-1">Gestión de políticas, usuarios y auditoría</p>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-8 border-b border-slate-700 overflow-x-auto">
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

        {/* Tab Content */}
        <div className="bg-slate-700/30 rounded-xl border border-slate-600 p-6 backdrop-blur-sm">
          {activeTab === 'policy' && (
            <PolicyTab onNotify={showNotification} setLoading={setLoading} />
          )}
          {activeTab === 'users' && (
            <UsersTab onNotify={showNotification} setLoading={setLoading} />
          )}
          {activeTab === 'audit' && (
            <AuditTab onNotify={showNotification} setLoading={setLoading} />
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
