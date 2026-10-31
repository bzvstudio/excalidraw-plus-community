import { useEffect, useState } from 'react'

export const SKELETON_DELAY_MS = 200

export function useDelayedVisibility(delay = SKELETON_DELAY_MS): boolean {
  const [visible, setVisible] = useState(delay <= 0)
  useEffect(() => {
    if (delay <= 0) return
    const timer = window.setTimeout(() => setVisible(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])
  return visible
}
