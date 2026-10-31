import { readPersonValue, writePersonValue } from '@/helpers/person-storage'

const NAME = 'last-workspace'

export function rememberLastWorkspace(userId: string, workspaceId: string): void {
  writePersonValue(NAME, userId, workspaceId)
}

export function lastWorkspaceId(userId: string): string | undefined {
  return readPersonValue(NAME, userId)
}

export function homeWorkspace<Workspace extends { id: string }>(
  workspaces: readonly Workspace[],
  lastId: string | undefined,
): Workspace | undefined {
  return workspaces.find(({ id }) => id === lastId) ?? workspaces[0]
}
