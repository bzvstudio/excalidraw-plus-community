export const IS_MAC = typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.userAgent)

export const MOD_KEY = IS_MAC ? '⌘' : 'Ctrl'

export function chord(key: string, joiner = ' '): string {
  return IS_MAC ? `⌘${key}` : `Ctrl${joiner}${key}`
}

export function ariaChord(key: string): string {
  return `${IS_MAC ? 'Meta' : 'Control'}+${key}`
}
