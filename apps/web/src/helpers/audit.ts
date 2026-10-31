function detailOf(key: string, value: unknown): string | undefined {
  switch (key) {
    case 'role':
      return `role: ${String(value)}`
    case 'from':
      return `from ${String(value)}`
    case 'to':
      return `to ${String(value)}`
    case 'validForDays':
      return value === null ? 'never expires' : `valid for ${String(value)} days`
    case 'emailed':
      return value ? 'sent by email' : undefined
    case 'reason':
      return value === 'email_failed' ? 'the email could not be sent' : undefined
    case 'scope':
      return `access: ${String(value)}`
    case 'provider':
      return `provider: ${String(value)}`
    case 'model':
      return `model: ${String(value)}`
    case 'visionModel':
      return value ? `image model: ${String(value)}` : undefined
    case 'guestEditLinks':
      return value ? 'guests on links may edit' : 'guests on links may only view'
    case 'teamIds':
      if (!Array.isArray(value)) return undefined
      return value.length === 0 ? 'open to the whole workspace' : `kept to ${value.length} ${value.length === 1 ? 'team' : 'teams'}`
    case 'teamName':
      return `team: ${String(value)}`
    case 'fromCollectionId':
      return value === null ? 'from drafts' : undefined
    case 'toCollectionId':
      return value === null ? 'to drafts' : undefined
    default:
      return undefined
  }
}

export function auditDetails(metadata: Record<string, unknown>): string {
  return Object.entries(metadata)
    .flatMap(([key, value]) => detailOf(key, value) ?? [])
    .join(' · ')
}
