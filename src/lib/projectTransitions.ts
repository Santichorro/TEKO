import type { ProjectStatus } from '../types/project'

export const PROJECT_TRANSITIONS: Record<ProjectStatus, ProjectStatus[]> = {
  planning: ['active', 'archived'],
  active: ['paused', 'completed', 'archived'],
  paused: ['active', 'archived'],
  completed: ['archived', 'active'],
  archived: ['active', 'planning'],
  template: [],
}

export function canTransition(from: ProjectStatus, to: ProjectStatus): boolean {
  return PROJECT_TRANSITIONS[from].includes(to)
}

export function getAvailableTransitions(from: ProjectStatus): ProjectStatus[] {
  return PROJECT_TRANSITIONS[from]
}