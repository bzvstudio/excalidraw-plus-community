export type AgentClient = 'claude-code' | 'cursor' | 'claude-desktop'

export const AGENT_CLIENTS: { id: AgentClient; label: string; destination: string; where: string }[] = [
  { id: 'claude-code', label: 'Claude Code', destination: 'Terminal', where: 'Run this in a terminal.' },
  { id: 'cursor', label: 'Cursor', destination: 'mcp.json', where: 'Add this to ~/.cursor/mcp.json, or to .cursor/mcp.json in a project.' },
  {
    id: 'claude-desktop',
    label: 'Claude Desktop',
    destination: 'claude_desktop_config.json',
    where: 'Add this to claude_desktop_config.json (Settings → Developer → Edit Config), then restart Claude. It needs Node.js.',
  },
]

export const KEY_PLACEHOLDER = 'YOUR_API_KEY'

export const AGENT_REACH = 'An agent reaches only collections open to the whole workspace — never drafts or collections kept to teams.'
