import { mcpServerName, type McpTarget, mcpUrl } from '@/helpers/agent-setup'
import { useRuntimeConfig } from '@/services/config/config'

export function useMcpTarget(): McpTarget {
  const { productName } = useRuntimeConfig()
  return { url: mcpUrl(window.location.origin), name: mcpServerName(productName) }
}
