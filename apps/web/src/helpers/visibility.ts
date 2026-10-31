import { countLabel } from '@/helpers/home'

export type Visibility = { kind: 'drafts' } | { kind: 'everyone'; workspaceName: string } | { kind: 'teams'; teamCount: number; teamNames: string[] }

export function visibilityOf({
  drafts,
  collection,
  teams,
  workspaceName,
}: {
  drafts: boolean
  collection?: { teamIds: readonly string[] }
  teams?: readonly { id: string; name: string }[]
  workspaceName: string
}): Visibility | undefined {
  if (drafts) return { kind: 'drafts' }
  if (!collection) return undefined
  const { teamIds } = collection
  if (teamIds.length === 0) return { kind: 'everyone', workspaceName }
  return { kind: 'teams', teamCount: teamIds.length, teamNames: teamIds.flatMap((id) => teams?.find((team) => team.id === id)?.name ?? []) }
}

export function visibilityText(visibility: Visibility): { label: string; detail: string } {
  if (visibility.kind === 'drafts') {
    return { label: 'Only you', detail: 'Drafts are yours until you move them into a collection. Admins can see them too.' }
  }
  if (visibility.kind === 'everyone') {
    return { label: 'Everyone', detail: `Everyone in ${visibility.workspaceName} can see this collection.` }
  }
  const { teamCount, teamNames: names } = visibility
  const label = countLabel(teamCount, 'team', 'teams')
  if (names.length !== teamCount || names.length === 0) {
    return { label, detail: `Only members of its ${label}, and the workspace’s admins, can see this collection.` }
  }
  const listed = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
  return { label, detail: `Only ${listed}, and the workspace’s admins, can see this collection.` }
}
