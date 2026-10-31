import type { SubmitResult } from '@/types/forms'

export function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Try again.'
}

export async function attempt(run: () => Promise<unknown>): Promise<SubmitResult> {
  try {
    await run()
    return {}
  } catch (error) {
    return { error: messageOf(error) }
  }
}

export function asSentence(message: string): string {
  const trimmed = message.trim()
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`
}
