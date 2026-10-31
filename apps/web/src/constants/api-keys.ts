export const SCOPE_LABELS = { read: 'Read only', write: 'Read and write' } as const

export const SCOPE_HELP = {
  read: 'A script or agent can look at scenes in collections open to the whole workspace, but not change them.',
  write: 'A script or agent can look at scenes in collections open to the whole workspace, and create, rename and draw in them.',
} as const
