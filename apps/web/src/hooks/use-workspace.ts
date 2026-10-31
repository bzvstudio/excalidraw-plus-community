import { useRouteContext } from '@tanstack/react-router'

export function useWorkspace() {
  const { principal, workspace } = useRouteContext({ strict: false })
  if (!principal || !workspace) throw new Error('useWorkspace is only for pages inside a workspace')
  return { principal, workspace }
}
