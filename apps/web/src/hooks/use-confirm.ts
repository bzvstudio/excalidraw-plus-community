import { useState } from 'react'

export function useConfirm<Target>() {
  const [state, setState] = useState<{ target?: Target; open: boolean }>({ open: false })
  return {
    target: state.target,
    open: state.open,
    show: (target: Target) => setState({ target, open: true }),
    hide: () => setState((current) => ({ ...current, open: false })),
  }
}
