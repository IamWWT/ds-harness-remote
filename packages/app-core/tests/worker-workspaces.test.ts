vi.mock('expo', () => ({ requireOptionalNativeModule: () => undefined }))
import { describe, expect, it, vi } from 'vitest'
import { AndroidRemoteConnection } from '../src/services/connection'
import {
  filterHiddenWorkerSessions,
  filterHiddenWorkerWorkspaces,
  parseWorkerWorkspaces,
} from '../src/lib/worker-workspaces'
import type { WorkspaceView } from '../src/types'

const harness = (workspaceId: string, overrides: Partial<WorkspaceView> = {}): WorkspaceView => ({
  workspaceId,
  path: `/home/work/${workspaceId}`,
  title: workspaceId,
  sessionIds: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

describe('parseWorkerWorkspaces', () => {
  it('accepts the documented workspace and session id envelope', () => {
    expect(parseWorkerWorkspaces({ workspaces: ['ws-harness-1', 'ws-harness-2'], sessions: ['worker-1'] }))
      .toEqual({ workspaces: ['ws-harness-1', 'ws-harness-2'], sessions: ['worker-1'] })
  })

  it('accepts empty lists as "nothing to hide"', () => {
    expect(parseWorkerWorkspaces({ workspaces: [], sessions: [] })).toEqual({ workspaces: [], sessions: [] })
  })

  it('rejects missing, non-array or non-string entries (strict parse)', () => {
    for (const json of [
      undefined,
      null,
      {},
      { workspaces: 'ws-1', sessions: [] },
      { workspaces: [1], sessions: [] },
      { workspaces: ['ws-1', null], sessions: [] },
      { workspaces: ['ws-1'], sessions: [false] },
      { workspaces: ['ws-1'], sessions: [], extra: true },
      ['ws-1'],
    ]) {
      expect(() => parseWorkerWorkspaces(json)).toThrow()
    }
  })

  it('rejects duplicate workspace or Session ids instead of partially hiding rows', () => {
    expect(() => parseWorkerWorkspaces({ workspaces: ['a', 'a'], sessions: [] })).toThrow()
    expect(() => parseWorkerWorkspaces({ workspaces: [], sessions: ['worker-1', 'worker-1'] })).toThrow()
  })
})

describe('filterHiddenWorkerWorkspaces', () => {
  const catalog = [
    harness('ws-harness-1'),
    harness('ws-harness-2'),
    harness('ws-harness-3'),
    harness('ws-codex-1', { backend: 'codex' }),
    harness('ws-cursor-1', { backend: 'cursor' }),
  ]

  it('removes only matching Harness rows and keeps the rest of the catalog', () => {
    const visible = filterHiddenWorkerWorkspaces(catalog, ['ws-harness-1', 'ws-harness-3'])
    expect(visible.map(item => item.workspaceId)).toEqual([
      'ws-harness-2', 'ws-codex-1', 'ws-cursor-1',
    ])
  })

  it('never removes non-Harness rows even when their id matches the hidden set', () => {
    const visible = filterHiddenWorkerWorkspaces(catalog, ['ws-codex-1', 'ws-cursor-1'])
    expect(visible.map(item => item.workspaceId)).toEqual([
      'ws-harness-1', 'ws-harness-2', 'ws-harness-3', 'ws-codex-1', 'ws-cursor-1',
    ])
  })

  it('keeps the whole list when no hidden ids are known (plugin absent fallback)', () => {
    const visible = filterHiddenWorkerWorkspaces(catalog, [])
    expect(visible).toEqual(catalog)
  })

  it('keeps the selected worker Session available as the active list row', () => {
    const visible = filterHiddenWorkerSessions([
      { sessionId: 'worker-t1' }, { sessionId: 'worker-t2' }, { sessionId: 'session-user' },
    ], ['worker-t1', 'worker-t2'], 'worker-t1')
    expect(visible.map(item => item.sessionId)).toEqual(['worker-t1', 'session-user'])
  })

  it('is order-preserving and non-mutating', () => {
    const before = catalog.map(item => item.workspaceId)
    const visible = filterHiddenWorkerWorkspaces(catalog, ['ws-harness-2'])
    expect(catalog.map(item => item.workspaceId)).toEqual(before)
    expect(visible.map(item => item.workspaceId)).toEqual([
      'ws-harness-1', 'ws-harness-3', 'ws-codex-1', 'ws-cursor-1',
    ])
  })
})

describe('filterHiddenWorkerSessions', () => {
  it('hides only matching Harness worker Sessions and preserves other backends', () => {
    const sessions = [
      { sessionId: 'worker-t1' }, { sessionId: 'worker-t2' },
      { sessionId: 'cursor:one', backend: 'cursor' },
    ]
    expect(filterHiddenWorkerSessions(sessions, ['worker-t1']).map(item => item.sessionId))
      .toEqual(['worker-t2', 'cursor:one'])
  })
})

describe('AndroidRemoteConnection.listSuperagentWorkerWorkspaceIds', () => {
  it('keeps the list when no connection is established (plugin absent fallback)', async () => {
    const connection = new AndroidRemoteConnection()
    await expect(connection.listSuperagentWorkerWorkspaceIds()).resolves.toEqual({ workspaces: [], sessions: [] })
  })
})