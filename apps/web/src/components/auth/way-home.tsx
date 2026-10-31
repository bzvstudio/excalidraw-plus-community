import { Link } from '@tanstack/react-router'
import { buttonVariants } from '@/components/ui/button'
import { HOME_PATH } from '@/constants/routes'
import { useSignedIn } from '@/services/auth/session'

export function WayHome() {
  const signedIn = useSignedIn()
  const button = buttonVariants({ size: 'lg', className: 'w-full' })

  if (signedIn === undefined) return <div aria-hidden className="h-10" />
  if (signedIn) {
    return (
      <Link to={HOME_PATH} className={button}>
        Go to your workspace
      </Link>
    )
  }
  return (
    <Link to="/sign-in" className={button}>
      Sign in
    </Link>
  )
}
