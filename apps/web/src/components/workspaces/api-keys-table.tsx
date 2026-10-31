import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { SCOPE_LABELS } from '@/constants/api-keys'
import { timeAgo } from '@/helpers/time'
import { cn } from '@/lib/utils'
import type { ApiKeyItem } from '@/types/api'

const STATUS_LABELS = { active: 'Active', expired: 'Expired', revoked: 'Revoked' } as const

function dateOf(value: string | null) {
  return value ? new Date(value).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : undefined
}

export function ApiKeysTable({ keys, onRevoke }: { keys: ApiKeyItem[]; onRevoke: (key: ApiKeyItem) => void }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="pl-4">Key</TableHead>
          <TableHead className="max-sm:hidden">Access</TableHead>
          <TableHead className="max-md:hidden">Last used</TableHead>
          <TableHead className="max-sm:hidden">Expires</TableHead>
          <TableHead className="pr-4">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {keys.map((key) => {
          const active = key.status === 'active'
          return (
            <TableRow key={key.id} data-row-key={key.id} className={cn(!active && 'text-muted-foreground')}>
              <TableCell className="w-full max-w-0 py-3 pl-4">
                <p className={cn('truncate font-medium', active ? 'text-foreground' : 'text-muted-foreground')}>{key.name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  <span className="font-mono">{key.visiblePrefix}…</span> · {key.createdByName ?? 'a former member'},{' '}
                  {dateOf(key.createdAt)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground sm:hidden">
                  {SCOPE_LABELS[key.scope]} · {active ? `expires ${dateOf(key.expiresAt) ?? 'never'}` : STATUS_LABELS[key.status]}
                </p>
              </TableCell>
              <TableCell className="max-sm:hidden">
                <Badge variant={key.scope === 'write' ? 'secondary' : 'outline'}>{SCOPE_LABELS[key.scope]}</Badge>
              </TableCell>
              <TableCell className="whitespace-nowrap max-md:hidden">
                {key.lastUsedAt ? timeAgo(new Date(key.lastUsedAt)) : 'Never'}
              </TableCell>
              <TableCell className="whitespace-nowrap max-sm:hidden">
                {active ? (dateOf(key.expiresAt) ?? 'Never') : <Badge variant="outline">{STATUS_LABELS[key.status]}</Badge>}
              </TableCell>
              <TableCell className="pr-4 text-right">
                {active && (
                  <Button variant="ghost" size="sm" data-row-action aria-label={`Revoke ${key.name}`} onClick={() => onRevoke(key)}>
                    Revoke
                  </Button>
                )}
              </TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}
