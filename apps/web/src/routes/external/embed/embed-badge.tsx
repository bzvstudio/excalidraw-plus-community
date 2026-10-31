import { LogoMark } from '@/components/brand/logo'
import { HOME_PATH } from '@/constants/routes'
import { useRuntimeConfig } from '@/services/config/config'

export function EmbedBadge() {
  const { productName } = useRuntimeConfig()

  return (
    <a
      href={HOME_PATH}
      target="_blank"
      rel="noopener noreferrer"
      className="absolute right-3 bottom-3 z-10 flex h-7 items-center gap-1.5 rounded-full bg-popover/90 pr-2.5 pl-1 text-xs font-medium text-muted-foreground shadow-float backdrop-blur-sm transition-colors duration-150 outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none"
    >
      <LogoMark className="size-5" />
      <span className="max-w-40 truncate">{productName}</span>
      <span className="sr-only">, opens in a new tab</span>
    </a>
  )
}
