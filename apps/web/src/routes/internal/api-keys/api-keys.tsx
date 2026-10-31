import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ChevronDownIcon, KeyRoundIcon, PlusIcon, TriangleAlertIcon } from 'lucide-react'
import { type ReactNode, useRef, useState } from 'react'
import { toast } from 'sonner'
import { CopyField } from '@/components/copy-field'
import { AdminsOnly } from '@/components/settings/admins-only'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { SettingsField } from '@/components/settings/settings-field'
import { SettingsCard, SettingsHeading, SettingsNote } from '@/components/settings/settings-section'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button, buttonVariants } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { FIELD_CONTROL, Input } from '@/components/ui/input'
import { AgentSetup } from '@/components/workspaces/agent-setup'
import { ApiKeysTable } from '@/components/workspaces/api-keys-table'
import { SCOPE_HELP, SCOPE_LABELS } from '@/constants/api-keys'
import type { McpTarget } from '@/helpers/agent-setup'
import { API_KEY_VALIDITY_OPTIONS, apiKeyFormSchema, type ApiKeyFormValues, validForDaysOf } from '@/helpers/api-key-forms'
import { newApiKeyLink, settingsLink } from '@/helpers/places'
import { attempt, messageOf } from '@/helpers/results'
import { canManageWorkspace } from '@/helpers/roles'
import { fieldProps, settingsPage } from '@/helpers/settings-pages'
import { useConfirm } from '@/hooks/use-confirm'
import { focusAfterRow, rowKeys } from '@/hooks/use-focus-after-removal'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useMcpTarget } from '@/hooks/use-mcp-target'
import { useWorkspace } from '@/hooks/use-workspace'
import { cn } from '@/lib/utils'
import { createApiKey, type NewApiKey, revokeApiKey } from '@/services/api-keys/api-keys'
import { trpc } from '@/trpc'
import type { ApiKeyItem } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('api-keys')

const REACH =
  'A key reaches only collections open to the whole workspace — never drafts or collections kept to teams — and stops working the moment it is revoked or expires. MCP clients use the same keys.'

function ConnectAgent({ mcp, apiKey, footer }: { mcp: McpTarget; apiKey?: string; footer?: ReactNode }) {
  return (
    <SettingsCard
      footer={footer}
      title="Connect an AI agent"
      description={
        apiKey
          ? 'The setups below already hold this key. Like the key, they won’t be shown with it again.'
          : 'Claude Code, Cursor, Claude Desktop and other MCP clients reach the workspace’s shared scenes with one of these keys.'
      }
      className="mt-8"
    >
      <div className="px-5 py-5">
        <AgentSetup target={mcp} apiKey={apiKey} />
      </div>
    </SettingsCard>
  )
}

export function ApiKeysRoute() {
  const { workspace } = useWorkspace()
  const canManage = canManageWorkspace(workspace.role)
  const keys = useQuery({ ...trpc.apiKeys.list.queryOptions({ workspaceId: workspace.id }), enabled: canManage })
  const mcp = useMcpTarget()

  return (
    <ApiKeysPage
      workspaceSlug={workspace.slug}
      mcp={mcp}
      keys={keys.data ?? []}
      canManage={canManage}
      onRevoke={(key) => attempt(() => revokeApiKey(workspace.id, key.id))}
    />
  )
}

export function ApiKeysPage({
  workspaceSlug,
  mcp,
  keys,
  canManage,
  onRevoke,
}: {
  workspaceSlug: string
  mcp: McpTarget
  keys: ApiKeyItem[]
  canManage: boolean
  onRevoke: (key: ApiKeyItem) => Promise<SubmitResult>
}) {
  const revoking = useConfirm<{ key: ApiKeyItem; order: string[] }>()
  const list = useRef<HTMLDivElement>(null)
  const newKey = (
    <Link {...newApiKeyLink(workspaceSlug)} className={buttonVariants()}>
      <PlusIcon aria-hidden />
      New key
    </Link>
  )

  if (!canManage) {
    return (
      <>
        <SettingsHeading title={PAGE.label} description={PAGE.description} />
        <AdminsOnly what="a key for a script or an MCP client" />
      </>
    )
  }

  return (
    <>
      <SettingsHeading title={PAGE.label} description={PAGE.description} actions={keys.length > 0 && newKey} />
      {keys.length === 0 ? (
        <EmptyState
          icon={KeyRoundIcon}
          title="No API keys yet"
          description="Create a key to let a script, an integration or an MCP client work with this workspace’s shared scenes."
          action={newKey}
          className="rounded-xl border border-dashed"
        />
      ) : (
        <div ref={list}>
          <ApiKeysTable keys={keys} onRevoke={(key) => revoking.show({ key, order: rowKeys(list.current) })} />
        </div>
      )}
      <SettingsNote>{REACH}</SettingsNote>
      <ConnectAgent mcp={mcp} />
      {revoking.target && (
        <ConfirmDialog
          open={revoking.open}
          title={`Revoke “${revoking.target.key.name}”?`}
          description="Anything using this key stops working straight away. A revoked key can’t be turned back on; you’d create a new one."
          action="Revoke key"
          busyAction="Revoking…"
          cancel="Keep it"
          onClose={revoking.hide}
          onConfirm={async () => {
            const { key, order } = revoking.target!
            const result = await onRevoke(key)
            if (!result.error) {
              toast(`Revoked “${key.name}”`)
              focusAfterRow(list.current, order, key.id)
            }
            return result
          }}
        />
      )}
    </>
  )
}

export function CreateApiKeyRoute() {
  const { workspace } = useWorkspace()

  return (
    <CreateApiKeyPage
      workspaceSlug={workspace.slug}
      mcp={useMcpTarget()}
      canManage={canManageWorkspace(workspace.role)}
      onCreate={(key) => createApiKey(workspace.id, key)}
    />
  )
}

export function CreateApiKeyPage({
  workspaceSlug,
  mcp,
  canManage,
  onCreate,
}: {
  workspaceSlug: string
  mcp: McpTarget
  canManage: boolean
  onCreate: (key: NewApiKey) => Promise<string>
}) {
  const [created, setCreated] = useState<{ name: string; secret: string }>()
  const [suggestedName] = useState(() => `Integration ${new Date().toISOString().slice(0, 10)}`)
  const { register, errors, isSubmitting, error, submit } = useFormSubmission<ApiKeyFormValues>(
    apiKeyFormSchema,
    async (values) => {
      try {
        const secret = await onCreate({ name: values.name, scope: values.scope, validForDays: validForDaysOf(values.validity) })
        setCreated({ name: values.name, secret })
        return {}
      } catch (failure) {
        return { error: messageOf(failure) }
      }
    },
    { name: suggestedName, scope: 'write', validity: '90' },
  )
  const backToKeys = settingsLink(workspaceSlug, 'api-keys')

  if (!canManage) {
    return (
      <>
        <SettingsHeading title="New API key" description={PAGE.description} />
        <AdminsOnly what="a key for a script or an MCP client" />
      </>
    )
  }

  if (created) {
    return (
      <>
        <SettingsHeading title="Your new key" description={`“${created.name}” is ready. Put it wherever it’s needed now.`} />
        <SettingsCard>
          <div className="flex flex-col gap-3 px-5 py-5">
            <CopyField label="API key" value={created.secret} />
            <p className="flex items-start gap-2 text-sm text-warning-foreground">
              <TriangleAlertIcon aria-hidden className="mt-0.5 size-4 shrink-0" />
              This is the only time the key is shown. Copy it before leaving this page; if it’s lost, revoke it and create
              another.
            </p>
          </div>
        </SettingsCard>
        <ConnectAgent
          mcp={mcp}
          apiKey={created.secret}
          footer={
            <Link {...backToKeys} className={cn(buttonVariants(), 'ml-auto')}>
              Done
            </Link>
          }
        />
      </>
    )
  }

  return (
    <>
      <SettingsHeading title="New API key" description="Give the key a name you’ll recognise, choose how long it lasts and what it may do." />
      <form onSubmit={submit} noValidate>
        <SettingsCard
          footer={
            <>
              <Link {...backToKeys} className={cn(buttonVariants({ variant: 'ghost' }), 'ml-auto')}>
                Cancel
              </Link>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Creating…' : 'Create key'}
              </Button>
            </>
          }
        >
          <div className="flex flex-col gap-5 px-5 py-5">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <SettingsField
              id="key-name"
              label="Name"
              error={errors.name?.message}
              hint="Name it after what will use it, such as a script or an editor."
            >
              <Input {...fieldProps('key-name', errors.name?.message)} {...register('name')} autoFocus spellCheck={false} />
            </SettingsField>
            <SettingsField id="key-validity" label="Expires after" hint="It stops working on its own after this long.">
              <div className="relative sm:max-w-60">
                <select
                  {...fieldProps('key-validity')}
                  {...register('validity')}
                  className={cn(FIELD_CONTROL, 'h-9 appearance-none pr-9')}
                >
                  {API_KEY_VALIDITY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
                />
              </div>
            </SettingsField>
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-medium text-foreground">Access</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(['write', 'read'] as const).map((value) => (
                  <label
                    key={value}
                    className="flex cursor-pointer items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors duration-150 hover:bg-accent/60 has-checked:border-foreground/30 has-checked:bg-accent has-focus-visible:ring-3 has-focus-visible:ring-ring motion-reduce:transition-none"
                  >
                    <input type="radio" value={value} {...register('scope')} className="mt-0.5 size-4 shrink-0 accent-foreground outline-none" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">{SCOPE_LABELS[value]}</span>
                      <span className="text-xs text-pretty text-muted-foreground">{SCOPE_HELP[value]}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
        </SettingsCard>
      </form>
      <SettingsNote>{REACH}</SettingsNote>
    </>
  )
}
