import { CopyIcon } from 'lucide-react'
import { CopyField, copyToClipboard } from '@/components/copy-field'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { AGENT_CLIENTS, AGENT_REACH, KEY_PLACEHOLDER } from '@/constants/agent-setup'
import { agentSnippet, type McpTarget } from '@/helpers/agent-setup'

export function AgentSetup({ target, apiKey }: { target: McpTarget; apiKey?: string }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium text-foreground">MCP address</span>
        <CopyField label="MCP address" value={target.url} />
      </div>
      <Tabs defaultValue={AGENT_CLIENTS[0]!.id} className="gap-3">
        <TabsList className="max-sm:w-full">
          {AGENT_CLIENTS.map((client) => (
            <TabsTrigger key={client.id} value={client.id}>
              {client.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {AGENT_CLIENTS.map((client) => {
          const snippet = agentSnippet(client.id, target, apiKey)
          return (
            <TabsContent key={client.id} value={client.id} className="flex flex-col gap-2">
              <p className="text-sm text-pretty text-muted-foreground">
                {client.where}
                {!apiKey && <> Put one of your keys where it says {KEY_PLACEHOLDER}.</>}
              </p>
              <div className="overflow-hidden rounded-lg border bg-muted/50">
                <div className="flex items-center justify-between gap-2 border-b py-1 pr-1 pl-3">
                  <span className="truncate font-mono text-xs text-muted-foreground">{client.destination}</span>
                  <Button variant="ghost" size="xs" aria-label={`Copy: ${client.label} setup`} onClick={() => copyToClipboard(snippet)}>
                    <CopyIcon aria-hidden />
                    Copy
                  </Button>
                </div>
                <pre aria-label={`${client.label} setup`} className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-foreground">
                  {snippet}
                </pre>
              </div>
            </TabsContent>
          )
        })}
      </Tabs>
      <p className="text-xs text-pretty text-muted-foreground">{AGENT_REACH}</p>
    </div>
  )
}
