import { EyeIcon, PencilIcon } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'

export function GuestRole({ viewOnly }: { viewOnly: boolean }) {
  return (
    <Badge variant="outline" className="h-6 gap-1.5 px-2.5 text-muted-foreground">
      {viewOnly ? <EyeIcon aria-hidden /> : <PencilIcon aria-hidden />}
      {viewOnly ? 'Can view' : 'Can edit'}
    </Badge>
  )
}

export function GuestIdentity({ name }: { name: string }) {
  return (
    <span className="flex h-7 max-w-48 min-w-0 items-center gap-2 rounded-full bg-muted p-0.5 text-xs md:pr-3">
      <Avatar name={name} seed={name} size="sm" />
      <span className="min-w-0 truncate font-medium text-foreground max-md:sr-only">
        <span className="sr-only">You appear as </span>
        {name}
      </span>
      <span className="shrink-0 text-muted-foreground max-md:hidden">Guest</span>
    </span>
  )
}
