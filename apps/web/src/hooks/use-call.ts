import type { JoinRequest } from '@repo/api'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { CALL_ENDED, CALL_FAILED, CALL_REJOIN_AFTER_MS, MICROPHONE_MISSING } from '@/constants/calls'
import type { CallEnd, CallSession, CallSnapshot } from '@/services/calls/call-session'
import { requestCallTicket } from '@/services/calls/calls'

export type CallState =
  | { status: 'idle'; notice?: string }
  | { status: 'joining' }
  | { status: 'in-call'; snapshot: CallSnapshot; notice?: string }

const EMPTY: CallSnapshot = { people: [], muted: true, sharing: false, audioBlocked: false }

export function useCall(request: JoinRequest) {
  const [state, setState] = useState<CallState>({ status: 'idle' })
  const session = useRef<CallSession | null>(null)
  const generation = useRef(0)
  const rejoinedAt = useRef(Number.NEGATIVE_INFINITY)

  const join = useCallback(
    async function connect(rejoining = false) {
      const mine = ++generation.current
      const current = () => generation.current === mine
      setState({ status: 'joining' })
      try {
        const ticket = await requestCallTicket(request)
        const { startCall } = await import('@/services/calls/call-session')
        if (!current()) return
        const started = await startCall(ticket, {
          onChange: (snapshot) => {
            if (!current()) return
            setState((was) => ({
              status: 'in-call',
              snapshot,
              notice: was.status === 'in-call' && snapshot.muted ? was.notice : undefined,
            }))
          },
          onMicrophoneMissing: () => {
            if (!current()) return
            setState((was) => ({ status: 'in-call', snapshot: was.status === 'in-call' ? was.snapshot : EMPTY, notice: MICROPHONE_MISSING }))
          },
          onEnd: (end: CallEnd) => {
            if (!current()) return
            session.current = null
            if (end === 'removed' && Date.now() - rejoinedAt.current > CALL_REJOIN_AFTER_MS) {
              rejoinedAt.current = Date.now()
              void connect(true)
            } else {
              generation.current += 1
              setState({ status: 'idle', notice: end === 'left' ? undefined : CALL_ENDED })
            }
          },
        })
        if (current()) session.current = started
        else void started.leave()
      } catch {
        if (!current()) return
        session.current = null
        setState({ status: 'idle', notice: rejoining ? CALL_ENDED : CALL_FAILED })
      }
    },
    [request],
  )

  useEffect(
    () => () => {
      generation.current += 1
      void session.current?.leave()
    },
    [],
  )

  const controls = useMemo(
    () => ({
      join: () => void join(),
      leave: () => void session.current?.leave(),
      setMuted: (muted: boolean) => void session.current?.setMuted(muted),
      setSharing: (sharing: boolean) => void session.current?.setSharing(sharing),
      startAudio: () => void session.current?.startAudio(),
    }),
    [join],
  )

  return { state, ...controls }
}
