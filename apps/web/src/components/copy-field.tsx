import { CopyIcon } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    toast('Copied to the clipboard')
  } catch {
    toast.error('Could not copy. Select the text and copy it yourself.')
  }
}

export function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-2">
      <Input readOnly aria-label={label} value={value} onFocus={(event) => event.target.select()} />
      <Button variant="outline" aria-label={`Copy: ${label}`} onClick={() => copyToClipboard(value)}>
        <CopyIcon aria-hidden />
        Copy
      </Button>
    </div>
  )
}
