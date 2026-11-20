import { Client } from '@stomp/stompjs'
import { readAuth } from '../utils/authStorage'

function websocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

function invalidReason(event) {
  if (!event || typeof event !== 'object' || Array.isArray(event)) return 'invalid_shape'
  if (typeof event.eventId !== 'string' || !event.eventId) return 'missing_event_id'
  if (typeof event.type !== 'string' || !event.type) return 'missing_event_type'
  if (!Number.isSafeInteger(event.conversationId)) return 'invalid_conversation_id'
  if (!Number.isSafeInteger(event.conversationVersion)) return 'invalid_conversation_version'
  if (!event.summary || typeof event.summary !== 'object' || Array.isArray(event.summary)) return 'missing_summary'
  if (!Number.isSafeInteger(event.summary.id) || event.summary.id !== event.conversationId) return 'invalid_summary_id'
  if (!Number.isSafeInteger(event.summary.version)) return 'invalid_summary_version'
  if (event.message != null && (
    typeof event.message !== 'object' ||
    !Number.isSafeInteger(event.message.id) ||
    typeof event.message.senderRole !== 'string' ||
    typeof event.message.content !== 'string'
  )) return 'invalid_message'
  return null
}

function reportInvalidEvent(reason, onInvalidEvent) {
  // Never log the frame body: chat events can contain message and customer data.
  console.warn('[chat-realtime] Ignored event', { reason })
  try { onInvalidEvent?.({ reason }) }
  catch { console.warn('[chat-realtime] Invalid-event callback failed') }
}

export function handleChatEventFrame(body, onEvent, onInvalidEvent) {
  let event
  try { event = JSON.parse(body) }
  catch { reportInvalidEvent('invalid_json', onInvalidEvent); return }

  const reason = invalidReason(event)
  if (reason) { reportInvalidEvent(reason, onInvalidEvent); return }

  try { onEvent?.(event) }
  catch { reportInvalidEvent('event_handler_failed', onInvalidEvent) }
}

export function subscribeToChatEvents(onEvent, onConnectionChange, onInvalidEvent) {
  const token = readAuth()?.accessToken
  if (!token) return () => {}

  let connectedOnce = false
  const client = new Client({
    brokerURL: websocketUrl(),
    connectHeaders: { Authorization: `Bearer ${token}` },
    reconnectDelay: 3000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      const reconnected = connectedOnce
      connectedOnce = true
      onConnectionChange?.(true, { reconnected })
      client.subscribe('/user/queue/chat', (message) => {
        handleChatEventFrame(message.body, onEvent, onInvalidEvent)
      })
    },
    onWebSocketClose: () => onConnectionChange?.(false),
    onStompError: () => onConnectionChange?.(false),
  })
  client.activate()
  return () => {
    void client.deactivate()
  }
}
