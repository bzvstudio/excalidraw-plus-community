import type { SignInOption } from '@repo/api'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import type { SubmitResult } from '@/types/forms'

export function ProviderButtons({
  options,
  onChoose,
}: {
  options: SignInOption[]
  onChoose: (option: SignInOption) => Promise<SubmitResult>
}) {
  const [error, setError] = useState<string>()
  const [pending, setPending] = useState<string>()

  if (options.length === 0) return null

  const choose = async (option: SignInOption) => {
    setPending(option.id)
    const result = await onChoose(option)
    setError(result.error)
    setPending(undefined)
  }

  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => (
        <Button
          key={option.id}
          variant="outline"
          size="lg"
          className="w-full"
          disabled={pending !== undefined}
          onClick={() => choose(option)}
        >
          Continue with {option.label}
        </Button>
      ))}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <Separator className="flex-1 bg-border" />
        or
        <Separator className="flex-1 bg-border" />
      </div>
    </div>
  )
}
