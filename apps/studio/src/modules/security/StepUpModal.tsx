import React, { useState } from 'react';
import { useAuth } from '../auth/SecurityContextProvider';

interface StepUpModalProps {
  onSuccess: () => void;
  onCancel: () => void;
  reason?: string;
}

export function StepUpModal({ onSuccess, onCancel, reason }: StepUpModalProps) {
  const { getAccessToken, setAccessToken } = useAuth();
  const accessToken = getAccessToken();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      // Paso 1: solicitar step-up challenge
      const challengeRes = await fetch('/api/security/step-up/request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: reason ?? 'Step-up requerido' }),
      });
      if (!challengeRes.ok) throw new Error('No se pudo iniciar el step-up');
      const { challengeToken } = (await challengeRes.json()) as { challengeToken: string };

      // Paso 2: verificar OTP
      const verifyRes = await fetch('/api/security/step-up/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ challengeToken, otp }),
      });
      if (!verifyRes.ok) {
        const err = (await verifyRes.json()) as { error?: string };
        throw new Error(err.error ?? 'OTP incorrecto');
      }
      const { accessToken: newToken } = (await verifyRes.json()) as { accessToken: string };
      setAccessToken(newToken);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-gray-900">Verificación adicional</h2>
        <p className="mb-4 text-sm text-gray-500">
          {reason ?? 'Esta acción requiere confirmar tu identidad. Ingresa el código OTP enviado a tu correo.'}
        </p>
        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Código de 6 dígitos"
            className="w-full rounded border border-gray-300 px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
            autoFocus
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="flex-1 rounded bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
