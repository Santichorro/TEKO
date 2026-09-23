import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/Authcontext.tsx';
import { resetPasswordSchema } from './Authschemas';

export default function Resetpasswordpage() {
  const { session, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();

  // Si Supabase ya detectó el token del correo en la URL, session existe
  // y toca mostrar el formulario de "nueva contraseña" en vez del de "pedir correo".
  const [mode, setMode] = useState<'request' | 'update'>('request');

  useEffect(() => {
    if (session) setMode('update');
  }, [session]);

  // --- Modo: pedir correo ---
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleRequest(e: FormEvent) {
    e.preventDefault();
    const result = resetPasswordSchema.safeParse({ email });
    if (!result.success) {
      setEmailError(result.error.issues[0].message);
      return;
    }
    setEmailError(null);
    await resetPassword(result.data.email);
    // Por seguridad no revelamos si el correo existe o no
    setSent(true);
  }

  // --- Modo: nueva contraseña ---
  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleUpdate(e: FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      setPasswordError('Mínimo 8 caracteres');
      return;
    }
    setPasswordError(null);
    setSubmitting(true);
    const { error } = await updatePassword(newPassword);
    setSubmitting(false);
    if (error) {
      setPasswordError('No pudimos actualizar la contraseña, intenta de nuevo');
      return;
    }
    navigate('/dashboard', { replace: true });
  }

  if (mode === 'update') {
    return (
      <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
        <form onSubmit={handleUpdate} className="w-full max-w-sm flex flex-col gap-6">
          <div>
            <h1 className="font-display text-3xl mb-1">Nueva contraseña</h1>
            <p className="label opacity-60">Define tu nueva contraseña</p>
          </div>

          {passwordError && (
            <p role="alert" className="text-sm text-red-600">
              {passwordError}
            </p>
          )}

          <Input
            label="Nueva contraseña"
            type="password"
            placeholder="Mínimo 8 caracteres"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            error={passwordError ?? undefined}
          />

          <Button type="submit" variant="primary" disabled={submitting}>
            {submitting ? 'Guardando...' : 'Guardar contraseña'}
          </Button>
        </form>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
      <form onSubmit={handleRequest} className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Recuperar contraseña</h1>
          <p className="label opacity-60">Te enviamos un enlace a tu correo</p>
        </div>

        {sent ? (
          <p className="label">
            Si el correo existe en TEKO, te llegó un enlace para restablecer tu contraseña.
          </p>
        ) : (
          <>
            <Input
              label="Correo"
              type="email"
              placeholder="tu@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={emailError ?? undefined}
            />
            <Button type="submit" variant="primary">
              Enviar enlace
            </Button>
          </>
        )}
      </form>
    </main>
  );
}