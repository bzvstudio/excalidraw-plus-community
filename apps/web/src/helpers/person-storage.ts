function keyOf(name: string, userId: string): string {
  return `${name}:${userId}`
}

export function readPersonValue(name: string, userId: string): string | undefined {
  try {
    return localStorage.getItem(keyOf(name, userId)) ?? undefined
  } catch {
    return undefined
  }
}

export function writePersonValue(name: string, userId: string, value: string): void {
  try {
    localStorage.setItem(keyOf(name, userId), value)
  } catch {
    return
  }
}
