import { useState } from 'react';
import type { TeamRole } from '../services/Teamservice';
import { createInvitation } from '../services/Teamservice';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';

/**
 * No conozco la API exacta de tus componentes Modal y Select del
 * Día 2 (props de apertura/cierre, forma de las opciones). Asumí:
 * - Modal: <Modal open={bool} onClose={fn}>{children}</Modal>
 * - Select: <Select value={} onChange={fn}><option>...</option></Select>
 * Ajusta si tu API real es distinta.
 */
const INVITABLE_ROLES: TeamRole[] = ['admin', 'leader', 'member', 'observer'];

interface TeaminvitemodalProps {
  teamId: string;
  open: boolean;
  onClose: () => void;
  onInvited?: () => void;
}

export function Teaminvitemodal({ teamId, open, onClose, onInvited }: TeaminvitemodalProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function reset() {
    setEmail('');
    setRole('member');
    setError(null);
    setInviteLink(null);
    setCopied(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const { token } = await createInvitation(teamId, email, role);
      // El link real depende de cómo montes la ruta de aceptación (paso 7).
      // Ajusta /invitaciones/aceptar a la ruta que definas.
      const link = `${window.location.origin}/invitaciones/aceptar?token=${token}`;
      setInviteLink(link);
      onInvited?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la invitación.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy() {
    if (!inviteLink) return;
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <h2>Invitar miembro</h2>

      {!inviteLink ? (
        <form onSubmit={handleSubmit} className="teko-invite-modal__form">
          <label>
            Correo
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="persona@correo.com"
            />
          </label>

          <label>
            Rol
            <Select value={role} onChange={(e: any) => setRole(e.target.value as TeamRole)} options={[]}>
              {INVITABLE_ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </label>

          {error && <p className="teko-invite-modal__error">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear invitación'}
          </Button>
        </form>
      ) : (
        <div className="teko-invite-modal__result">
          <p>Invitación creada. Comparte este link (expira en 7 días):</p>
          <div className="teko-invite-modal__link-row">
            <input type="text" readOnly value={inviteLink} />
            <Button type="button" onClick={handleCopy}>
              {copied ? 'Copiado' : 'Copiar'}
            </Button>
          </div>
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cerrar
          </Button>
        </div>
      )}
    </Modal>
  );
}