import { MCP_PATH } from '@repo/api/system.const'
import { type AgentClient, KEY_PLACEHOLDER } from '@/constants/agent-setup'

export type McpTarget = { url: string; name: string }

export function mcpUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}${MCP_PATH}`
}

export function mcpServerName(productName: string): string {
  return (
    productName
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'workspace'
  )
}

export function agentSnippet(client: AgentClient, { url, name }: McpTarget, apiKey?: string): string {
  const key = apiKey ?? KEY_PLACEHOLDER
  switch (client) {
    case 'claude-code':
      return `claude mcp add --transport http ${name} ${url} \\\n  --header "Authorization: Bearer ${key}"`
    case 'cursor':
      return JSON.stringify({ mcpServers: { [name]: { url, headers: { Authorization: `Bearer ${key}` } } } }, null, 2)
    case 'claude-desktop':
      return JSON.stringify(
        {
          mcpServers: {
            [name]: {
              command: 'npx',
              args: ['-y', 'mcp-remote', url, '--header', 'Authorization:${AUTH_HEADER}'],
              env: { AUTH_HEADER: `Bearer ${key}` },
            },
          },
        },
        null,
        2,
      )
  }
}
