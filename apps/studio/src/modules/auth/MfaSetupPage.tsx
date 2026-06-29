import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './SecurityContextProvider';

interface TotpSetupData {
  qrUri?: string;
  secretBase32?: string;
  credentialId?: string;
  message?: string;
}

export function MfaSetupPage() {
  const navigate = useNavigate();
  const { getAccessToken } = useAuth();
  const [setupData, setSetupData] = useState<TotpSetupData | null>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'init' | 'verify'>('init');

  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      navigate('/auth/login');
      return;
    }
    initMfaSetup();
  }, [navigate, getAccessToken]);

  const initMfaSetup = async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch('/api/auth/mfa/setup/init', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        setError('Error al iniciar configuración de MFA.');
        return;
      }

      const data = (await res.json()) as TotpSetupData;
      setSetupData(data);
    } catch (err) {
      setError('Error de conexión.');
      console.error('[MfaSetup] Error:', err);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const token = getAccessToken();
    if (!token) {
      setError('Sesión expirada.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/mfa/setup/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code: code.trim() }),
      });

      if (!res.ok) {
        const errorData = (await res.json()) as { error?: { message?: string } };
        setError(errorData.error?.message ?? 'Código inválido.');
        return;
      }

      navigate('/admin/settings', { state: { mfaSuccess: true } });
    } catch (err) {
      setError('Error al verificar código.');
      console.error('[MfaSetup] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950">
      <div className="w-full max-w-sm p-8 bg-gray-900 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-white mb-2">Configurar autenticación de dos factores</h1>

        {step === 'init' && setupData && (
          <>
            <p className="text-gray-400 text-sm mb-8">
              Escanea el código QR con tu aplicación de autenticador (Google Authenticator, Authy, Microsoft
              Authenticator, etc.)
            </p>

            {setupData.qrUri && (
              <div className="bg-white p-4 rounded-lg mb-6 flex justify-center">
                <img src={setupData.qrUri} alt="QR Code" className="w-64 h-64" />
              </div>
            )}

            <p className="text-gray-400 text-sm mb-4">
              <strong>¿No puedes escanear el código?</strong> Ingresa manualmente esta clave en tu autenticador:
            </p>

            {setupData.secretBase32 && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 flex items-center justify-between">
                <code className="text-white font-mono text-sm break-all">{setupData.secretBase32}</code>
                <button
                  type="button"
                  onClick={() => {
                    if (setupData.secretBase32) navigator.clipboard.writeText(setupData.secretBase32);
                  }}
                  className="ml-4 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 flex-shrink-0"
                >
                  Copiar
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => setStep('verify')}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
              disabled={loading}
            >
              Continuar
            </button>
          </>
        )}

        {step === 'verify' && (
          <form onSubmit={handleVerifyCode} className="space-y-4">
            <p className="text-gray-400 text-sm">
              Ingresa el código de 6 dígitos de tu autenticador para confirmar la configuración
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">Código TOTP</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                disabled={loading}
                autoFocus
                className="w-full px-4 py-4 text-center text-3xl tracking-widest bg-gray-800 text-white rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500"
              />
            </div>

            {error && <p className="text-red-400 text-sm">{error}</p>}

            <button
              type="submit"
              disabled={code.length !== 6 || loading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verificando...' : 'Confirmar'}
            </button>

            <button
              type="button"
              onClick={() => {
                setStep('init');
                setCode('');
                setError('');
              }}
              disabled={loading}
              className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 disabled:opacity-50"
            >
              Volver
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
