import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../auth/SecurityContextProvider';

type MfaStep = 'intro' | 'qr' | 'verify' | 'done';

interface MfaSetupData {
  qrUri: string;
  secret: string;
}

export function MfaSetupPage() {
  const { getAccessToken } = useAuth();
  const accessToken = getAccessToken();
  const [step, setStep] = useState<MfaStep>('intro');
  const [setupData, setSetupData] = useState<MfaSetupData | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function initSetup() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/totp/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error('No se pudo iniciar la configuración MFA');
      const data = (await res.json()) as MfaSetupData;
      setSetupData(data);
      setStep('qr');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function verifySetup(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/mfa/totp/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ code }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Código incorrecto');
      }
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md p-6">
      <h1 className="mb-6 text-xl font-bold text-gray-900">Autenticación de dos factores (TOTP)</h1>

      {step === 'intro' && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Configura una app de autenticación (Google Authenticator, Authy, etc.) para añadir
            una capa adicional de seguridad a tu cuenta.
          </p>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={() => void initSetup()}
            disabled={loading}
            className="w-full rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-50"
          >
            {loading ? 'Iniciando…' : 'Configurar TOTP'}
          </button>
        </div>
      )}

      {step === 'qr' && setupData && (
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Escanea el código QR con tu app de autenticación y luego ingresa el código de 6 dígitos.
          </p>
          <div className="flex justify-center rounded border border-gray-200 bg-white p-4">
            <QRCodeSVG
              value={setupData.qrUri}
              size={200}
              level="M"
              includeMargin
              title="QR TOTP"
              aria-label="QR TOTP"
            />
          </div>
          <details className="text-xs text-gray-500">
            <summary className="cursor-pointer">Mostrar clave manual</summary>
            <code className="mt-1 block break-all rounded bg-gray-100 p-2 font-mono">
              {setupData.secret}
            </code>
          </details>
          <form onSubmit={(e) => void verifySetup(e)} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Código de 6 dígitos"
              className="w-full rounded border border-gray-300 px-3 py-2 text-center text-xl tracking-widest focus:outline-none focus:ring-2 focus:ring-red-500"
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full rounded bg-red-700 px-4 py-2 font-medium text-white hover:bg-red-800 disabled:opacity-50"
            >
              {loading ? 'Verificando…' : 'Activar TOTP'}
            </button>
          </form>
        </div>
      )}

      {step === 'done' && (
        <div className="rounded-lg bg-green-50 p-6 text-center">
          <div className="mb-2 text-3xl">✅</div>
          <h2 className="font-semibold text-green-800">TOTP activado</h2>
          <p className="mt-1 text-sm text-green-700">
            Tu cuenta ahora requiere un código TOTP al iniciar sesión.
          </p>
        </div>
      )}
    </div>
  );
}
