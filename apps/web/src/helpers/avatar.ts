const AVATAR_COLORS = ['#0ca678', '#1971c2', '#6741d9', '#c2255c', '#e8590c', '#2f9e44', '#0c8599', '#9c36b5']

export function initialOf(name: string): string {
  return Array.from(name.trim())[0]?.toUpperCase() ?? '?'
}

export function avatarColor(seed: string): string {
  let hash = 0
  for (const character of seed) hash = (hash * 31 + character.codePointAt(0)!) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]!
}

export function avatarIdOf(metadata: string | undefined): string | null {
  try {
    const parsed: unknown = JSON.parse(metadata ?? '')
    if (typeof parsed !== 'object' || parsed === null || !('avatarId' in parsed)) return null
    return typeof parsed.avatarId === 'string' ? parsed.avatarId : null
  } catch {
    return null
  }
}

export function centredSquare(width: number, height: number): { x: number; y: number; size: number } {
  const size = Math.min(width, height)
  return { x: (width - size) / 2, y: (height - size) / 2, size }
}
