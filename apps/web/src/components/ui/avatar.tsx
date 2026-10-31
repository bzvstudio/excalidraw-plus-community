import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "cn"
import { type CSSProperties, useState } from "react"
import { avatarColor, initialOf } from "@/helpers/avatar"

const avatarVariants = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full font-medium text-white select-none",
  {
    variants: {
      size: {
        xs: "size-5 text-[10px]",
        sm: "size-6 text-xs",
        default: "size-8 text-sm",
        lg: "size-10 text-base",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

function Avatar({
  name,
  seed,
  image,
  size,
  className,
  style,
}: { name: string; seed: string; image?: string; className?: string; style?: CSSProperties } & VariantProps<typeof avatarVariants>) {
  const [brokenImage, setBrokenImage] = useState<string>()
  const showsImage = image !== undefined && image !== brokenImage

  return (
    <span
      aria-hidden
      data-slot="avatar"
      className={cn(avatarVariants({ size }), showsImage && "overflow-hidden", className)}
      style={{ backgroundColor: avatarColor(seed), ...style }}
    >
      {showsImage ? (
        <img src={image} alt="" className="size-full object-cover" onError={() => setBrokenImage(image)} />
      ) : (
        initialOf(name)
      )}
    </span>
  )
}

function AvatarStack({
  people,
  max = 4,
  size = "sm",
  label,
  className,
}: {
  people: readonly { name: string; seed: string }[]
  max?: number
  label?: string
  className?: string
} & VariantProps<typeof avatarVariants>) {
  const shown = people.slice(0, max)
  const hidden = people.length - shown.length
  return (
    <span
      role="img"
      aria-label={label ?? people.map((person) => person.name).join(", ")}
      data-slot="avatar-stack"
      className={cn("flex items-center -space-x-1.5", className)}
    >
      {shown.map((person) => (
        <Avatar key={person.seed} name={person.name} seed={person.seed} size={size} className="ring-2 ring-background" />
      ))}
      {hidden > 0 && (
        <span
          aria-hidden
          className={cn(avatarVariants({ size }), "bg-muted text-muted-foreground tabular-nums ring-2 ring-background")}
        >
          +{hidden}
        </span>
      )}
    </span>
  )
}

export { Avatar, AvatarStack }
