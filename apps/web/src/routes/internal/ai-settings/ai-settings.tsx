import type { WorkspaceAiProvider } from '@repo/api'
import { WORKSPACE_AI_PROVIDERS } from '@repo/api/ai.const'
import { useQuery } from '@tanstack/react-query'
import { ExternalLinkIcon, ServerIcon, SparklesIcon } from 'lucide-react'
import { type ReactNode, useId, useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/settings/confirm-dialog'
import { SettingsField } from '@/components/settings/settings-field'
import { SettingsCard, SettingsHeading, SettingsNote, SettingsRow, SettingsStack } from '@/components/settings/settings-section'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { DelayedSkeleton, Skeleton } from '@/components/ui/skeleton'
import { PROVIDER_LABELS, workspaceKeyFormSchema, type WorkspaceKeyFormValues } from '@/helpers/ai-forms'
import { attempt } from '@/helpers/results'
import { canManageWorkspace } from '@/helpers/roles'
import { fieldProps, settingsPage } from '@/helpers/settings-pages'
import { useFormSubmission } from '@/hooks/use-form-submission'
import { useWorkspace } from '@/hooks/use-workspace'
import { removeWorkspaceKey, saveWorkspaceKey, type WorkspaceKeyInput } from '@/services/ai/ai'
import { useRuntimeConfig } from '@/services/config/config'
import { trpc } from '@/trpc'
import type { WorkspaceAiKey } from '@/types/api'
import type { SubmitResult } from '@/types/forms'

const PAGE = settingsPage('ai')

export function AiSettingsRoute() {
  const { workspace } = useWorkspace()
  const { aiEnabled, aiDailyLimit } = useRuntimeConfig()
  const key = useQuery(trpc.ai.workspaceKey.queryOptions({ workspaceId: workspace.id }))

  if (key.isError) {
    return (
      <>
        <SettingsHeading title={PAGE.label} description={PAGE.description} />
        <AiLoadFailed retrying={key.isFetching} onRetry={() => void key.refetch()} />
      </>
    )
  }

  if (!key.isSuccess) {
    return (
      <>
        <SettingsHeading title={PAGE.label} description={PAGE.description} />
        <DelayedSkeleton label="Loading the AI settings">
          <div className="flex flex-col gap-6">
            <Skeleton className="h-24 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        </DelayedSkeleton>
      </>
    )
  }

  return (
    <AiSettingsPage
      current={key.data}
      server={{ enabled: aiEnabled, dailyLimit: aiDailyLimit }}
      canManage={canManageWorkspace(workspace.role)}
      onSave={(input) => attempt(() => saveWorkspaceKey(workspace.id, input))}
      onRemove={() => attempt(() => removeWorkspaceKey(workspace.id))}
    />
  )
}

export function AiLoadFailed({ retrying, onRetry }: { retrying: boolean; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl border px-4 py-3 text-sm text-destructive">
      The AI settings couldn’t be loaded.
      <Button variant="outline" size="sm" aria-busy={retrying || undefined} onClick={() => retrying || onRetry()}>
        {retrying ? 'Trying…' : 'Try again'}
      </Button>
    </div>
  )
}

const PROVIDERS = {
  anthropic: {
    models: 'Claude models',
    keysUrl: 'https://console.anthropic.com/settings/keys',
    placeholder: 'sk-ant-…',
  },
  openai: {
    models: 'GPT models',
    keysUrl: 'https://platform.openai.com/api-keys',
    placeholder: 'sk-…',
  },
} as const satisfies Record<WorkspaceAiProvider, unknown>

function serverLine({ enabled, dailyLimit }: { enabled: boolean; dailyLimit: number }): string {
  if (!enabled) return 'This server has no AI provider of its own, so AI is off until you add a key.'
  if (dailyLimit === 0) return 'Requests go to the provider this server is set up with.'
  return `Requests go to the provider this server is set up with, up to ${dailyLimit} a day for each person.`
}

function ProviderLink({ provider, children }: { provider: WorkspaceAiProvider; children: ReactNode }) {
  return (
    <a
      href={PROVIDERS[provider].keysUrl}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 rounded-sm font-medium text-foreground underline decoration-foreground/30 underline-offset-4 outline-none hover:decoration-foreground focus-visible:ring-3 focus-visible:ring-ring"
    >
      {children}
      <ExternalLinkIcon aria-hidden className="size-3" />
    </a>
  )
}

export function AiSettingsPage({
  current,
  server,
  canManage,
  onSave,
  onRemove,
}: {
  current: WorkspaceAiKey | null
  server: { enabled: boolean; dailyLimit: number }
  canManage: boolean
  onSave: (input: WorkspaceKeyInput) => Promise<SubmitResult>
  onRemove: () => Promise<SubmitResult>
}) {
  const [editing, setEditing] = useState<WorkspaceAiProvider>()
  const [removing, setRemoving] = useState(false)

  return (
    <>
      <SettingsHeading title={PAGE.label} description={PAGE.description} />
      <SettingsStack>
        <SettingsCard title="In use now">
          <div className="flex items-start gap-3 px-5 py-4">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              {current ? <SparklesIcon aria-hidden className="size-4" /> : <ServerIcon aria-hidden className="size-4" />}
            </span>
            <div className="flex min-w-0 flex-col gap-0.5">
              <p className="font-medium text-foreground">
                {current ? `${PROVIDER_LABELS[current.provider]}, with the workspace’s own key` : 'The server’s AI provider'}
              </p>
              <p className="text-sm text-pretty text-muted-foreground">
                {current ? (
                  <>
                    Text to diagram uses <span className="font-mono text-xs text-foreground">{current.model}</span>
                    {current.visionModel ? (
                      <>
                        , and wireframe to code uses <span className="font-mono text-xs text-foreground">{current.visionModel}</span>.
                      </>
                    ) : (
                      '.'
                    )}
                  </>
                ) : (
                  serverLine(server)
                )}
              </p>
            </div>
          </div>
        </SettingsCard>
        <div>
          <SettingsCard
            title="Your own key"
            description="Send this workspace’s AI requests to your own provider account, and choose the model. One key is used at a time."
          >
            {WORKSPACE_AI_PROVIDERS.map((provider) => {
              const key = current?.provider === provider ? current : null
              const label = PROVIDER_LABELS[provider]
              return (
                <SettingsRow
                  key={provider}
                  label={
                    <span className="flex items-center gap-2">
                      {label}
                      {key ? <Badge variant="success">Connected</Badge> : <Badge variant="outline">Not connected</Badge>}
                    </span>
                  }
                  description={
                    key ? (
                      <>
                        Key ending <span className="font-mono text-xs text-foreground">{key.lastFour}</span>
                      </>
                    ) : (
                      <>
                        For {PROVIDERS[provider].models}. <ProviderLink provider={provider}>Get a key</ProviderLink>
                      </>
                    )
                  }
                >
                  {canManage && (
                    <>
                      {key && (
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setRemoving(true)}>
                          Remove
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        aria-label={`${key ? 'Replace' : 'Add'} ${label} key`}
                        onClick={() => setEditing(provider)}
                      >
                        {key ? 'Replace key' : 'Add key'}
                      </Button>
                    </>
                  )}
                </SettingsRow>
              )
            })}
          </SettingsCard>
          <SettingsNote>
            {canManage
              ? 'Keys are stored encrypted. Once saved, only the last four characters are ever shown.'
              : 'Only admins can connect or remove a key.'}
          </SettingsNote>
        </div>
      </SettingsStack>
      {editing && (
        <KeyDialog
          provider={editing}
          current={current?.provider === editing ? current : null}
          replaces={current && current.provider !== editing ? current : null}
          onClose={() => setEditing(undefined)}
          onSave={async ({ visionModel, ...values }) => {
            const result = await onSave({ ...values, visionModel: visionModel || null })
            if (!result.error) {
              setEditing(undefined)
              toast(`${PROVIDER_LABELS[values.provider]} key saved`)
            }
            return result
          }}
        />
      )}
      {removing && current && (
        <ConfirmDialog
          title={`Remove the ${PROVIDER_LABELS[current.provider]} key?`}
          description={
            server.enabled
              ? 'AI requests go back to the server’s provider straight away.'
              : 'This server has no AI provider of its own, so AI stops working in this workspace until a key is added again.'
          }
          action="Remove key"
          busyAction="Removing…"
          cancel="Keep it"
          onClose={() => setRemoving(false)}
          onConfirm={async () => {
            const result = await onRemove()
            if (!result.error) toast(`${PROVIDER_LABELS[current.provider]} key removed`)
            return result
          }}
        />
      )}
    </>
  )
}

function KeyDialog({
  provider,
  current,
  replaces,
  onSave,
  onClose,
}: {
  provider: WorkspaceAiProvider
  current: WorkspaceAiKey | null
  replaces: WorkspaceAiKey | null
  onSave: (values: WorkspaceKeyFormValues) => Promise<SubmitResult>
  onClose: () => void
}) {
  const { register, errors, isSubmitting, error, submit } = useFormSubmission(workspaceKeyFormSchema, onSave, {
    provider,
    model: current?.model ?? '',
    visionModel: current?.visionModel ?? '',
  })
  const label = PROVIDER_LABELS[provider]
  const id = useId()

  return (
    <Dialog open onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} noValidate className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{current ? `Replace the ${label} key` : `Connect ${label}`}</DialogTitle>
            <DialogDescription>
              We check the key and each model with one small request, which your provider may charge a little for.
              {replaces && ` Saving replaces the ${PROVIDER_LABELS[replaces.provider]} key.`}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-4">
            <SettingsField
              id={`${id}-key`}
              label="API key"
              error={errors.apiKey?.message}
              hint={<ProviderLink provider={provider}>Get a {label} key</ProviderLink>}
            >
              <Input
                {...fieldProps(`${id}-key`, errors.apiKey?.message)}
                type="password"
                autoComplete="off"
                spellCheck={false}
                autoFocus
                placeholder={PROVIDERS[provider].placeholder}
                {...register('apiKey')}
              />
            </SettingsField>
            <SettingsField id={`${id}-model`} label="Model" error={errors.model?.message} hint="Used for text to diagram and the chat.">
              <Input {...fieldProps(`${id}-model`, errors.model?.message)} spellCheck={false} autoCapitalize="off" {...register('model')} />
            </SettingsField>
            <SettingsField
              id={`${id}-vision`}
              label="Model for wireframe to code"
              error={errors.visionModel?.message}
              hint="Optional. It must be able to read images; leave it empty to turn wireframe to code off."
            >
              <Input
                {...fieldProps(`${id}-vision`, errors.visionModel?.message)}
                spellCheck={false}
                autoCapitalize="off"
                {...register('visionModel')}
              />
            </SettingsField>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Checking…' : 'Save key'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
