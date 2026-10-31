import { AuthFrameLayout } from '@/components/auth/auth-frame'
import { WayHome } from '@/components/auth/way-home'
import { messageOf } from '@/helpers/results'
import { LinkProblem } from '@/routes/external/link/link'

export function SharedUnavailable({ error }: { error: unknown }) {
  return (
    <AuthFrameLayout>
      <LinkProblem message={messageOf(error)} action={<WayHome />} />
    </AuthFrameLayout>
  )
}
