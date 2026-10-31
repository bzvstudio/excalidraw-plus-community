import { ImageUpIcon } from 'lucide-react'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { AVATAR_ACCEPT } from '@/constants/avatar'
import type { SubmitResult } from '@/types/forms'

export function PhotoButtons({
  hasPhoto,
  onUpload,
  onRemove,
  onResult,
}: {
  hasPhoto: boolean
  onUpload: (file: File) => Promise<SubmitResult>
  onRemove: () => Promise<SubmitResult>
  onResult: (error: string | undefined) => void
}) {
  const [saving, setSaving] = useState(false)
  const input = useRef<HTMLInputElement>(null)

  const save = async (change: () => Promise<SubmitResult>) => {
    setSaving(true)
    const result = await change()
    setSaving(false)
    onResult(result.error)
  }

  return (
    <div className="flex shrink-0 gap-2 max-sm:w-full">
      <Button variant="outline" size="sm" disabled={saving} onClick={() => input.current?.click()}>
        <ImageUpIcon aria-hidden />
        {hasPhoto ? 'Change photo' : 'Upload photo'}
      </Button>
      {hasPhoto && (
        <Button variant="ghost" size="sm" disabled={saving} onClick={() => save(onRemove)}>
          Remove
        </Button>
      )}
      <input
        ref={input}
        type="file"
        accept={AVATAR_ACCEPT}
        aria-label="Photo"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (file) void save(() => onUpload(file))
        }}
      />
    </div>
  )
}
