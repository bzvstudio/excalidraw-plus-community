import { queryClient, trpc, trpcClient } from '@/trpc'

function refreshTeams(workspaceId: string) {
  return queryClient.invalidateQueries({ queryKey: trpc.teams.list.queryKey({ workspaceId }) })
}

export async function createTeam(workspaceId: string, name: string) {
  await trpcClient.teams.create.mutate({ workspaceId, name })
  await refreshTeams(workspaceId)
}

export async function renameTeam(workspaceId: string, teamId: string, name: string) {
  await trpcClient.teams.rename.mutate({ workspaceId, teamId, name })
  await refreshTeams(workspaceId)
}

export async function deleteTeam(workspaceId: string, teamId: string) {
  await trpcClient.teams.delete.mutate({ workspaceId, teamId })
  await refreshTeams(workspaceId)
}

export async function addTeamMember(workspaceId: string, teamId: string, userId: string) {
  await trpcClient.teams.addMember.mutate({ workspaceId, teamId, userId })
  await refreshTeams(workspaceId)
}

export async function removeTeamMember(workspaceId: string, teamId: string, userId: string) {
  await trpcClient.teams.removeMember.mutate({ workspaceId, teamId, userId })
  await refreshTeams(workspaceId)
}
