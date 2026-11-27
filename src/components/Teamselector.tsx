import { useEffect, useRef, useState } from 'react';
import { useTeams } from '../context/Teamscontext';
import { TEAM_ROLE_LABEL } from '../lib/labels';

/** Selector de equipo para la cabecera del Sidebar (fondo ink). */
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
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (loading) return <p className="label text-surface/50">Cargando equipos…</p>;
  if (teams.length === 0) return <p className="label text-surface/50">Sin equipos</p>;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 border-2 border-surface/30 px-3 py-2 text-left hover:border-surface focus-visible:outline-none focus-visible:border-accent"
      >
        <span className="min-w-0">
          <span className="block font-display text-sm uppercase truncate">
            {currentTeam?.name ?? 'Selecciona un equipo'}
          </span>
          {currentTeam && (
            <span className="label text-surface/50">{TEAM_ROLE_LABEL[currentTeam.role]}</span>
          )}
        </span>
        <span aria-hidden="true" className="label">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full mt-1 z-20 bg-surface text-ink border-2 border-ink shadow-hard"
        >
          {teams.map((team) => {
            const selected = team.id === currentTeam?.id;
            return (
              <li key={team.id} role="option" aria-selected={selected}>
                <button
                  type="button"
                  onClick={() => {
                    switchTeam(team.id);
                    setOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-left text-sm ${
                    selected ? 'bg-accent text-surface' : 'hover:bg-ink/10'
                  }`}
                >
                  <span className="truncate">{team.name}</span>
                  <span className="label opacity-70">{TEAM_ROLE_LABEL[team.role]}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
