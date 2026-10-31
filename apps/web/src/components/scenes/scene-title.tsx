import { SCENE_TITLE_MAX_LENGTH } from '@repo/api/scenes.const'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const TEXT = 'truncate text-sm font-medium text-foreground'

export function SceneTitle({ title, onRename }: { title: string; onRename?: (title: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(title)
  const settled = useRef(false)
  const refocus = useRef(false)
  const button = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (editing || !refocus.current) return
    refocus.current = false
    button.current?.focus()
  }, [editing])

  if (!onRename) return <span className={cn(TEXT, 'max-w-[40ch]')}>{title}</span>

  const finish = (save: boolean, returnFocus: boolean) => {
    if (settled.current) return
    settled.current = true
    refocus.current = returnFocus
    setEditing(false)
    const next = draft.trim()
    if (save && next !== '' && next !== title) onRename(next)
  }

  if (editing) {
    return (
      <input
        aria-label="Scene name"
        value={draft}
        maxLength={SCENE_TITLE_MAX_LENGTH}
        autoFocus
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => finish(true, false)}
        onKeyDown={(event) => {
          event.stopPropagation()
          if (event.key !== 'Enter' && event.key !== 'Escape') return
          event.preventDefault()
          finish(event.key === 'Enter', true)
        }}
        style={{ width: `${Math.min(Math.max(draft.length, 8), 40) + 2}ch` }}
        className="-mx-1.5 h-7 max-w-[min(40ch,50vw)] min-w-0 rounded-md border border-input bg-background px-1.5 text-sm font-medium text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring"
      />
    )
  }

  return (
    <button
      ref={button}
      type="button"
      aria-label={`Rename scene: ${title}`}
      title="Rename"
      onClick={() => {
        settled.current = false
        setDraft(title)
        setEditing(true)
      }}
      className={cn(
        TEXT,
        '-mx-1.5 h-7 max-w-[40ch] cursor-text rounded-md px-1.5 text-left outline-none transition-colors duration-150 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring motion-reduce:transition-none',
      )}
    >
      {title}
    </button>
  )
}
