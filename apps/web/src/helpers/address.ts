const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID.test(value)
}

export function takeTokenFromAddress(): string {
  const token = window.location.hash.slice(1)
  if (token) window.history.replaceState(window.history.state, '', `${window.location.pathname}${window.location.search}`)
  return token
}
