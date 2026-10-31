const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

const STEPS: { below: number; one: string; many?: [unit: string, size: number] }[] = [
  { below: 45 * SECOND, one: 'a few seconds' },
  { below: 90 * SECOND, one: 'a minute' },
  { below: 45 * MINUTE, one: 'a minute', many: ['minutes', MINUTE] },
  { below: 90 * MINUTE, one: 'an hour' },
  { below: 22 * HOUR, one: 'an hour', many: ['hours', HOUR] },
  { below: 36 * HOUR, one: 'a day' },
  { below: 26 * DAY, one: 'a day', many: ['days', DAY] },
  { below: 45 * DAY, one: 'a month' },
  { below: 320 * DAY, one: 'a month', many: ['months', 30 * DAY] },
  { below: 548 * DAY, one: 'a year' },
]

function duration(milliseconds: number): string {
  const elapsed = Math.max(0, milliseconds)
  const step = STEPS.find(({ below }) => elapsed < below)
  if (!step) return `${Math.max(2, Math.round(elapsed / (365 * DAY)))} years`
  if (!step.many) return step.one
  const [unit, size] = step.many
  return `${Math.max(2, Math.round(elapsed / size))} ${unit}`
}

export function timeAgo(date: Date, now: Date = new Date()): string {
  return `${duration(now.getTime() - date.getTime())} ago`
}

export function timeUntil(date: Date, now: Date = new Date()): string {
  return `in ${duration(date.getTime() - now.getTime())}`
}

export function dayLabel(date: Date, now: Date = new Date()): string {
  const startOf = (day: Date) => new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
  const days = Math.max(0, Math.round((startOf(now) - startOf(date)) / DAY))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric' })
}
