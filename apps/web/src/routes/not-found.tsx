import { MapPinOffIcon } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'
import { AuthFrameLayout } from '@/components/auth/auth-frame'
import { WayHome } from '@/components/auth/way-home'

export function NotFoundPage() {
  return (
    <AuthFrameLayout>
      <AuthCard
        icon={MapPinOffIcon}
        title="Nothing lives at this address"
        description="It may have moved, the address may have a typo in it, or it belongs to a workspace you're not part of."
      >
        <WayHome />
      </AuthCard>
    </AuthFrameLayout>
  )
}
