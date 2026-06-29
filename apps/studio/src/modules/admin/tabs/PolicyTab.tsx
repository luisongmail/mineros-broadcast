import React, { useState, useEffect } from 'react';
import { AlertCircle, Save } from 'lucide-react';
import { useAdmin } from '../../../hooks/useAdmin';

interface PolicySettings {
  requireMfaForAll: boolean;
  gracePeriodDays: number;
  stepUpExpiryMinutes: number;
  maxFailedAttempts: number;
  lockoutDurationMinutes: number;
}

interface PolicyTabProps {
  onNotify: (type: 'success' | 'error' | 'info', message: string) => void;
  setLoading: (loading: boolean) => void;
}

const PolicyTab: React.FC<PolicyTabProps> = ({ onNotify, setLoading }) => {
  const { loading: apiLoading, updatePolicy } = useAdmin();
  const [policy, setPolicy] = useState<PolicySettings>({
    requireMfaForAll: true,
    gracePeriodDays: 7,
    stepUpExpiryMinutes: 5,
    maxFailedAttempts: 5,
    lockoutDurationMinutes: 30,
  });

  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setLoading(apiLoading);
  }, [apiLoading, setLoading]);

  const handleChange = (field: keyof PolicySettings, value: string | boolean) => {
    setPolicy((prev) => ({
      ...prev,
      [field]: typeof value === 'string' ? parseInt(value, 10) : value,
    }));
    setIsDirty(true);
  };

  const handleSave = async () => {
    try {
      await updatePolicy(policy);
      setIsDirty(false);
      onNotify('success', 'Políticas actualizadas exitosamente');
    } catch (error) {
      onNotify('error', error instanceof Error ? error.message : 'Error al actualizar políticas');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0" />
        <div>
          <p className="font-semibold text-blue-300">Políticas de Seguridad</p>
          <p className="text-sm text-blue-200/80 mt-1">
            Cambios se aplicarán a todos los usuarios. Se registrarán en la auditoría.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Require MFA for All */}
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={policy.requireMfaForAll}
              onChange={(e) => handleChange('requireMfaForAll', e.target.checked)}
              className="w-5 h-5 rounded bg-slate-700 border border-slate-500 cursor-pointer"
            />
            <div>
              <p className="font-semibold text-white">Requerir MFA para Todos</p>
              <p className="text-xs text-slate-400 mt-1">MFA obligatorio para acceder al sistema</p>
            </div>
          </label>
        </div>

        {/* MFA Grace Period */}
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <label className="block">
            <p className="font-semibold text-white mb-2">Período de Gracia MFA (días)</p>
            <input
              type="number"
              min="0"
              max="90"
              value={policy.gracePeriodDays}
              onChange={(e) => handleChange('gracePeriodDays', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-slate-400 mt-2">
              Días para configurar MFA sin restricciones
            </p>
          </label>
        </div>

        {/* Step-Up Expiry */}
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <label className="block">
            <p className="font-semibold text-white mb-2">Expiración Step-Up (minutos)</p>
            <input
              type="number"
              min="1"
              max="60"
              value={policy.stepUpExpiryMinutes}
              onChange={(e) => handleChange('stepUpExpiryMinutes', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-slate-400 mt-2">
              Ventana para re-verificar MFA en operaciones sensibles
            </p>
          </label>
        </div>

        {/* Max Failed MFA Attempts */}
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <label className="block">
            <p className="font-semibold text-white mb-2">Máx. Intentos MFA Fallidos</p>
            <input
              type="number"
              min="1"
              max="20"
              value={policy.maxFailedAttempts}
              onChange={(e) => handleChange('maxFailedAttempts', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-slate-400 mt-2">
              Intentos antes de bloquear cuenta
            </p>
          </label>
        </div>

        {/* Lockout Duration */}
        <div className="bg-slate-600/20 rounded-lg p-4 border border-slate-600">
          <label className="block">
            <p className="font-semibold text-white mb-2">Duración de Bloqueo (minutos)</p>
            <input
              type="number"
              min="5"
              max="1440"
              value={policy.lockoutDurationMinutes}
              onChange={(e) => handleChange('lockoutDurationMinutes', e.target.value)}
              className="w-full bg-slate-700 border border-slate-600 rounded px-3 py-2 text-white text-sm"
            />
            <p className="text-xs text-slate-400 mt-2">
              Tiempo de bloqueo después de múltiples fallos
            </p>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-3">
        <button
          onClick={() => {
            // Reset to last saved state
            setIsDirty(false);
          }}
          disabled={!isDirty}
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-700 disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          disabled={!isDirty}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold"
        >
          <Save className="w-4 h-4" />
          Guardar Cambios
        </button>
      </div>
    </div>
  );
};

export default PolicyTab;
