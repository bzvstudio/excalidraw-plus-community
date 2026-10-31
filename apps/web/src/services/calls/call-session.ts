import { DisconnectReason, type Participant, Room, RoomEvent, Track } from 'livekit-client'
import { avatarIdOf } from '@/helpers/avatar'
import type { CallTicket } from './calls'

export type CallPerson = {
  id: string
  name: string
  avatarId: string | null
  speaking: boolean
  muted: boolean
  isYou: boolean
}

export type CallScreen = {
  sharedBy: string
  attach: (element: HTMLVideoElement) => () => void
}

export type CallSnapshot = {
  people: CallPerson[]
  muted: boolean
  sharing: boolean
  audioBlocked: boolean
  screen?: CallScreen
}

export type CallSession = {
  setMuted: (muted: boolean) => Promise<void>
  setSharing: (sharing: boolean) => Promise<void>
  startAudio: () => Promise<void>
  leave: () => Promise<void>
}

export type CallEnd = 'left' | 'removed' | 'lost'

function personOf(participant: Participant, isYou: boolean): CallPerson {
  return {
    id: participant.identity,
    name: participant.name || 'Someone',
    avatarId: avatarIdOf(participant.metadata),
    speaking: participant.isSpeaking,
    muted: !participant.isMicrophoneEnabled,
    isYou,
  }
}

function screenOf(room: Room, screens: Map<string, CallScreen>): CallScreen | undefined {
  const everyone = [room.localParticipant, ...room.remoteParticipants.values()]
  const presenter = everyone.find((participant) => participant.getTrackPublication(Track.Source.ScreenShare)?.videoTrack)
  const track = presenter?.getTrackPublication(Track.Source.ScreenShare)?.videoTrack
  if (!presenter || !track?.sid) return undefined
  const known = screens.get(track.sid)
  if (known) return known
  const screen: CallScreen = {
    sharedBy: presenter === room.localParticipant ? 'You' : presenter.name || 'Someone',
    attach: (element) => {
      track.attach(element)
      return () => void track.detach(element)
    },
  }
  screens.clear()
  screens.set(track.sid, screen)
  return screen
}

function snapshotOf(room: Room, screens: Map<string, CallScreen>): CallSnapshot {
  const everyone = [room.localParticipant, ...room.remoteParticipants.values()]
  return {
    people: everyone.map((participant) => personOf(participant, participant === room.localParticipant)),
    muted: !room.localParticipant.isMicrophoneEnabled,
    sharing: room.localParticipant.isScreenShareEnabled,
    audioBlocked: !room.canPlaybackAudio,
    screen: screenOf(room, screens),
  }
}

export async function startCall(
  ticket: CallTicket,
  handlers: { onChange: (snapshot: CallSnapshot) => void; onEnd: (end: CallEnd) => void; onMicrophoneMissing: () => void },
): Promise<CallSession> {
  const room = new Room({ adaptiveStream: true, dynacast: true })
  const audio = new Map<string, HTMLMediaElement>()
  const screens = new Map<string, CallScreen>()
  let live = true
  const changed = () => {
    if (live) handlers.onChange(snapshotOf(room, screens))
  }
  const microphoneMissing = () => {
    if (live) handlers.onMicrophoneMissing()
  }

  room
    .on(RoomEvent.TrackSubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && track.sid) {
        const element = track.attach()
        audio.set(track.sid, element)
        document.body.append(element)
      }
      changed()
    })
    .on(RoomEvent.TrackUnsubscribed, (track) => {
      if (track.kind === Track.Kind.Audio && track.sid) {
        track.detach()
        audio.get(track.sid)?.remove()
        audio.delete(track.sid)
      }
      changed()
    })
    .on(RoomEvent.ParticipantConnected, changed)
    .on(RoomEvent.ParticipantDisconnected, changed)
    .on(RoomEvent.ActiveSpeakersChanged, changed)
    .on(RoomEvent.TrackMuted, changed)
    .on(RoomEvent.TrackUnmuted, changed)
    .on(RoomEvent.LocalTrackPublished, changed)
    .on(RoomEvent.LocalTrackUnpublished, changed)
    .on(RoomEvent.TrackPublished, changed)
    .on(RoomEvent.TrackUnpublished, changed)
    .on(RoomEvent.AudioPlaybackStatusChanged, changed)
    .on(RoomEvent.Disconnected, (reason) => {
      live = false
      for (const element of audio.values()) element.remove()
      audio.clear()
      if (reason === DisconnectReason.CLIENT_INITIATED) handlers.onEnd('left')
      else handlers.onEnd(reason === DisconnectReason.PARTICIPANT_REMOVED ? 'removed' : 'lost')
    })

  await room.connect(ticket.url, ticket.token)
  changed()
  void room.localParticipant.setMicrophoneEnabled(true).then(changed, microphoneMissing)

  return {
    setMuted: async (muted) => {
      await room.localParticipant.setMicrophoneEnabled(!muted).catch(microphoneMissing)
      changed()
    },
    setSharing: async (sharing) => {
      await room.localParticipant.setScreenShareEnabled(sharing, { audio: true }).catch(() => undefined)
      changed()
    },
    startAudio: async () => {
      await room.startAudio()
      changed()
    },
    leave: () => room.disconnect(),
  }
}
