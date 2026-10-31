const KEEP = 12

export type RecentVisit = { sceneId: string; at: number }

function keyOf(userId: string, workspaceId: string): string {
  return `recent-scenes:${userId}:${workspaceId}`
}

function visitOf(entry: unknown): RecentVisit | undefined {
  if (typeof entry === 'string') return { sceneId: entry, at: 0 }
  if (typeof entry !== 'object' || entry === null) return undefined
  const { sceneId, at } = entry as Record<string, unknown>
  return typeof sceneId === 'string' && typeof at === 'number' ? { sceneId, at } : undefined
}

export function recentVisits(userId: string, workspaceId: string): RecentVisit[] {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(keyOf(userId, workspaceId)) ?? '[]')
    return Array.isArray(stored) ? stored.flatMap((entry) => visitOf(entry) ?? []) : []
  } catch {
    return []
  }
}

export function recordVisit(userId: string, workspaceId: string, sceneId: string, at: number = Date.now()): void {
  try {
    const visits = [{ sceneId, at }, ...recentVisits(userId, workspaceId).filter((visit) => visit.sceneId !== sceneId)].slice(0, KEEP)
    localStorage.setItem(keyOf(userId, workspaceId), JSON.stringify(visits))
  } catch {
    return
  }
}
