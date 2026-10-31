import { getRouteApi, Link, useRouter } from '@tanstack/react-router'
import { LogInIcon } from 'lucide-react'
import { useCallback, useMemo } from 'react'
import { LogoMark } from '@/components/brand/logo'
import { GuestIdentity, GuestRole } from '@/components/scenes/guest-bar'
import { buttonVariants } from '@/components/ui/button'
import { sharedSceneLink } from '@/helpers/places'
import { SceneCanvas } from '@/routes/internal/scene/scene-canvas'
import { sharedFiles } from '@/services/files/files'
import { useSignedIn } from '@/services/auth/session'

const sharedRoute = getRouteApi('/external/share/$linkId')

const leading = <LogoMark className="mx-1 size-5" />

export function SharedSceneRoute() {
  const scene = sharedRoute.useLoaderData()
  const { linkId } = sharedRoute.useParams()
  const router = useRouter()
  const signedOut = useSignedIn() === false
  const files = useMemo(() => sharedFiles(linkId), [linkId])
  const room = useMemo(() => ({ linkId }), [linkId])
  const unavailable = useCallback(() => void router.invalidate(), [router])
  const returnTo = router.buildLocation(sharedSceneLink(linkId)).href
  const { guestName } = scene

  const guestControls = useCallback(
    (viewOnly: boolean) => (
      <>
        <GuestRole viewOnly={viewOnly} />
        <GuestIdentity name={guestName} />
        {signedOut && (
          <Link
            to="/sign-in"
            search={{ redirect: returnTo }}
            aria-label="Sign in"
            className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'text-muted-foreground hover:text-foreground max-md:w-8 max-md:px-0' })}
          >
            <LogInIcon aria-hidden />
            <span className="max-md:hidden">Sign in</span>
          </Link>
        )}
      </>
    ),
    [guestName, signedOut, returnTo],
  )

  return (
    <SceneCanvas
      key={linkId}
      scene={scene}
      room={room}
      readOnly={scene.access === 'view'}
      transfer={files}
      onUnavailable={unavailable}
      withLibrary={false}
      leading={leading}
      guestControls={guestControls}
    />
  )
}
