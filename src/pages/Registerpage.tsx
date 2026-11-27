import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useAuth } from '../context/Authcontext.tsx';
import { registerSchema } from './Authschemas';
import { getSafeRedirect } from '../lib/redirect';

export default function Registerpage() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = getSafeRedirect(location.search) ?? '/dashboard';
  const [confirmationSent, setConfirmationSent] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    const result = registerSchema.safeParse({ name, email, password });
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

    const { error, needsConfirmation } = await signUp(
      result.data.email,
      result.data.password,
      result.data.name,
      redirectTo
    );

    setSubmitting(false);

    if (error) {
      // Supabase devuelve "User already registered" cuando el correo ya existe
      setFormError(
        error.includes('already registered')
          ? 'Ese correo ya tiene una cuenta'
          : 'No pudimos crear tu cuenta, intenta de nuevo'
      );
      return;
    }

    if (needsConfirmation) {
      setConfirmationSent(true);
      return;
    }

    navigate(redirectTo, { replace: true });
  }

  if (confirmationSent) {
    return (
      <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
        <div className="w-full max-w-sm flex flex-col gap-4">
          <h1 className="font-display text-3xl">Revisa tu correo</h1>
          <p className="text-sm opacity-70">
            Te enviamos un enlace a <strong>{email}</strong> para confirmar tu cuenta. Al abrirlo
            vuelves a TEKO con la sesión iniciada.
          </p>
          <Link to={`/login${location.search}`} className="label underline">
            Ya la confirmé, iniciar sesión
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface text-ink flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-6">
        <div>
          <h1 className="font-display text-3xl mb-1">Crear cuenta</h1>
          <p className="label opacity-60">Empieza a organizar tu equipo en TEKO</p>
        </div>

        {formError && (
          <p role="alert" className="text-sm text-red-600">
            {formError}
          </p>
        )}

        <Input
          label="Nombre"
          placeholder="Tu nombre completo"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
        />

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
          placeholder="Mínimo 8 caracteres"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />

        <Button type="submit" variant="primary" disabled={submitting}>
          {submitting ? 'Creando cuenta...' : 'Crear cuenta'}
        </Button>

        <p className="label opacity-60 text-center">
          ¿Ya tienes cuenta?{' '}
          <Link to={`/login${location.search}`} className="underline">
            Inicia sesión
          </Link>
        </p>
      </form>
    </main>
  );
}