import { useState } from 'react';
import type { TeamRole } from '../services/Teamservice';
import { createInvitation } from '../services/Teamservice';
import { Modal } from '../components/ui/Modal';
import { Button } from '../components/ui/Button';
import { Select } from '../components/ui/Select';
import { Input } from '../components/ui/Input';
import { TEAM_ROLE_LABEL } from '../lib/labels';

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
    <Modal open={open} onClose={handleClose} title="Invitar miembro">
      {!inviteLink ? (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Input
            label="Correo"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="persona@correo.com"
          />

          <Select
            label="Rol"
            placeholder="Selecciona un rol"
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            options={INVITABLE_ROLES.map((r) => ({ value: r, label: TEAM_ROLE_LABEL[r] }))}
          />

          {error && <p className="label text-accent">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creando…' : 'Crear invitación'}
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-sm">Invitación creada. Comparte este link (expira en 7 días):</p>
          <div className="flex gap-2 items-end">
            <div className="flex-1 min-w-0">
              <Input label="Link de invitación" readOnly value={inviteLink} onFocus={(e) => e.target.select()} />
            </div>
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