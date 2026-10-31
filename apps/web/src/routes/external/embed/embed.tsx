import { useQuery } from '@tanstack/react-query'
import { getRouteApi } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { Editor } from '@/editor/editor'
import { useSceneFiles } from '@/hooks/use-scene-files'
import { type EmbeddedScene, embedFiles, loadEmbeddedScene } from '@/services/embeds/embeds'
import { EmbedBadge } from './embed-badge'
import { EmbedUnavailable } from './embed-unavailable'

const embedRoute = getRouteApi('/external/embed')

export function EmbedRoute() {
  const [token] = useState(() => window.location.hash.slice(1))
  const { theme } = embedRoute.useSearch()
  const scene = useQuery({ queryKey: ['embed', token], queryFn: () => loadEmbeddedScene(token), enabled: token !== '', retry: false })

  if (!token || scene.isError) return <EmbedUnavailable />
  if (!scene.data) return null
  return <EmbeddedCanvas token={token} scene={scene.data} theme={theme} />
}

function EmbeddedCanvas({ token, scene, theme }: { token: string; scene: EmbeddedScene; theme: 'light' | 'dark' }) {
  const transfer = useMemo(() => embedFiles(token), [token])
  const files = useSceneFiles({ transfer, initialElements: scene.elements })

  return (
    <div className="fixed inset-0">
      <Editor
        colorScheme={theme}
        themePreference={theme}
        onThemePreferenceChange={() => undefined}
        initialScene={scene}
        readOnly
        embedded
        libraryBrowsing={false}
        maxImageBytes={0}
        onReady={files.onReady}
      />
      <EmbedBadge />
    </div>
  )
}
