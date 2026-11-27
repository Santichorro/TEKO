import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/Authcontext.tsx';
import { loginSchema } from './Authschemas.ts';
import { getSafeRedirect } from '../lib/redirect';

export default function Loginpage() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        fieldErrors[issue.path[0] as string] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    const { error } = await signIn(result.data.email, result.data.password);

    setSubmitting(false);

    if (error) {
      setFormError('Correo o contraseña incorrectos');
      return;
    }

    const from = (location.state as { from?: { pathname: string; search?: string } } | null)?.from;
    const target =
      getSafeRedirect(location.search) ?? (from ? `${from.pathname}${from.search ?? ''}` : '/dashboard');
    navigate(target, { replace: true });
  }

  return (
    <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Iniciar sesión</h1>
          <p className="label opacity-60">Entra a tu cuenta de TEKO</p>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        <Input
          label="Correo"
          type="email"
          placeholder="tu@correo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
        />

        <Input
          label="Contraseña"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <div className="flex justify-end">
          <Link to="/reset-password" className="label opacity-60 hover:opacity-100">
            ¿Olvidaste tu contraseña?
          </Link>
        </div>

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Entrando...' : 'Entrar'}
        </Button>

        <p className="label opacity-60 text-center">
          ¿No tienes cuenta?{' '}
          <Link to={`/register${location.search}`} className="underline">
            Regístrate
          </Link>
        </p>
      </form>
    </main>
  );
}