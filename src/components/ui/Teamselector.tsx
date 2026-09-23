import { useState, useRef, useEffect } from 'react';
import { useTeams } from '../../context/Teamscontext';

/**
 * No conozco la API exacta de tu componente Dropdown del sistema visual
 * (Día 2), así que este selector está implementado de forma autónoma
 * con su propio manejo de apertura/cierre. Si tu Dropdown expone algo
 * tipo <Dropdown trigger={...}>{items}</Dropdown>, dime su firma y lo
 * adapto para que reutilice ese componente en vez de duplicar lógica.
 */
export function Teamselector() {
  const { teams, currentTeam, loading, switchTeam } = useTeams();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return <div className="teko-team-selector teko-team-selector--loading">Cargando equipos…</div>;
  }

  if (teams.length === 0) {
    return <div className="teko-team-selector teko-team-selector--empty">Sin equipos</div>;
  }

  return (
    <div className="teko-team-selector" ref={containerRef}>
      <button
        type="button"
        className="teko-team-selector__trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="teko-team-selector__name">{currentTeam?.name ?? 'Selecciona un equipo'}</span>
        <span className="teko-team-selector__role">{currentTeam?.role}</span>
      </button>

      {open && (
        <ul className="teko-team-selector__list" role="listbox">
          {teams.map((team) => (
            <li key={team.id} role="option" aria-selected={team.id === currentTeam?.id}>
              <button
                type="button"
                className="teko-team-selector__option"
                onClick={() => {
                  switchTeam(team.id);
                  setOpen(false);
                }}
              >
                <span>{team.name}</span>
                <span className="teko-team-selector__option-role">{team.role}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}