import type { WorkspaceView } from '../types'

/** Strict response parser for the allowlisted superagent worker workspace read. */
export interface WorkerWorkspaceVisibility {
  workspaces: string[]
  sessions: string[]
}

/** Strict response parser for the allowlisted superagent worker visibility read. */
export function parseWorkerWorkspaces(value: unknown): WorkerWorkspaceVisibility {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) throw new Error('Invalid worker workspace response.')
  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== 2 || !Array.isArray(record.workspaces) || !Array.isArray(record.sessions)) {
    throw new Error('Invalid worker workspace response.')
  }
  const ids = [...record.workspaces, ...record.sessions]
  if (ids.some(id => typeof id !== 'string' || id.length === 0)) throw new Error('Invalid worker workspace id.')
  if (new Set(record.workspaces).size !== record.workspaces.length || new Set(record.sessions).size !== record.sessions.length) {
    throw new Error('Duplicate worker workspace id.')
  }
  return { workspaces: record.workspaces as string[], sessions: record.sessions as string[] }
}

/** Hide only Harness rows; the full catalog remains available for operations. */
export function filterHiddenWorkerWorkspaces(
  workspaces: readonly WorkspaceView[],
  hiddenIds: readonly string[],
): WorkspaceView[] {
  if (hiddenIds.length === 0) return [...workspaces]
  const hidden = new Set(hiddenIds)
  return workspaces.filter(workspace =>
    (workspace.backend ?? 'harness') !== 'harness' || !hidden.has(workspace.workspaceId))
}

/** Hide only worker Session rows from the mobile list presentation. */
export function filterHiddenWorkerSessions<T extends { sessionId: string; backend?: string }>(
  sessions: readonly T[],
  hiddenIds: readonly string[],
  selectedSessionId?: string,
): T[] {
  if (hiddenIds.length === 0) return [...sessions]
  const hidden = new Set(hiddenIds)
  return sessions.filter(session => (session.backend ?? 'harness') !== 'harness'
    || !hidden.has(session.sessionId) || session.sessionId === selectedSessionId)
}
