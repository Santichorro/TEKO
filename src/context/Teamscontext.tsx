import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getUserTeams } from '../services/Teamservice';
import type { TeamWithRole } from '../services/Teamservice';
import { useAuth } from './Authcontext';

const CURRENT_TEAM_STORAGE_KEY = 'teko_current_team_id';

interface TeamsContextValue {
  teams: TeamWithRole[];
  currentTeam: TeamWithRole | null;
  loading: boolean;
  error: string | null;
  switchTeam: (teamId: string) => void;
  refreshTeams: () => Promise<void>;
}

const TeamsContext = createContext<TeamsContextValue | undefined>(undefined);

export function TeamsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [teams, setTeams] = useState<TeamWithRole[]>([]);
  const [currentTeamId, setCurrentTeamId] = useState<string | null>(
    () => localStorage.getItem(CURRENT_TEAM_STORAGE_KEY)
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeams = useCallback(async () => {
    if (!user) {
      setTeams([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const userTeams = await getUserTeams(user.id);
      setTeams(userTeams);

      // Si el equipo guardado ya no existe (o no hay ninguno guardado),
      // seleccionamos el primero disponible. Esto también cubre el caso
      // de un usuario recién invitado o recién creado su primer equipo.
      setCurrentTeamId((prev) => {
        const stillValid = prev && userTeams.some((t) => t.id === prev);
        return stillValid ? prev : (userTeams[0]?.id ?? null);
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudieron cargar los equipos.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadTeams();
  }, [loadTeams]);

  useEffect(() => {
    if (currentTeamId) {
      localStorage.setItem(CURRENT_TEAM_STORAGE_KEY, currentTeamId);
    }
  }, [currentTeamId]);

  const switchTeam = useCallback((teamId: string) => {
    setCurrentTeamId(teamId);
  }, []);

  const currentTeam = teams.find((t) => t.id === currentTeamId) ?? null;

  return (
    <TeamsContext.Provider
      value={{ teams, currentTeam, loading, error, switchTeam, refreshTeams: loadTeams }}
    >
      {children}
    </TeamsContext.Provider>
  );
}

export function useTeams(): TeamsContextValue {
  const ctx = useContext(TeamsContext);
  if (!ctx) {
    throw new Error('useTeams debe usarse dentro de un TeamsProvider');
  }
  return ctx;
}