import { TTDDialog, TTDDialogTrigger, TTDStreamFetch } from '@excalidraw/excalidraw'
import type { SavedChats, TTDPersistenceAdapter } from '@excalidraw/excalidraw/components/TTDDialog/types'
import { useState } from 'react'
import { AI_LIMIT_REACHED, AI_TOO_MANY_REQUESTS } from '@/constants/ai'
import { textToDiagramUrl } from '@/services/ai/ai'

function chatsInMemory(): TTDPersistenceAdapter {
  let chats: SavedChats = []
  return {
    loadChats: async () => chats,
    saveChats: async (saved) => {
      chats = saved
    },
  }
}

export function TextToDiagram({ sceneId }: { sceneId: string }) {
  const [chats] = useState(chatsInMemory)

  return (
    <>
      <TTDDialogTrigger />
      <TTDDialog
        persistenceAdapter={chats}
        renderWarning={(message) => (message.warningType === 'messageLimitExceeded' ? AI_LIMIT_REACHED : AI_TOO_MANY_REQUESTS)}
        onTextSubmit={({ messages, onChunk, onStreamCreated, signal }) =>
          TTDStreamFetch({ url: textToDiagramUrl(sceneId), messages, onChunk, onStreamCreated, signal, extractRateLimits: true })
        }
      />
    </>
  )
}
