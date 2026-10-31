import { LockIcon } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export function AdminsOnly({ what }: { what: string }) {
  return (
    <EmptyState
      icon={LockIcon}
      title="Only admins can see this page"
      description={`Ask an admin of the workspace if you need ${what}.`}
      className="rounded-xl border border-dashed"
    />
  )
}
