import { Client } from '@stomp/stompjs'

function websocketUrl() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}/ws`
}

export function subscribeToSeatEvents(showtimeId, onEvent, onConnected) {
  const client = new Client({
    brokerURL: websocketUrl(),
    reconnectDelay: 5000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    onConnect: () => {
      client.subscribe(`/topic/showtimes/${showtimeId}/seats`, (message) => {
        try {
          onEvent?.(JSON.parse(message.body))
        } catch {
          // Ignore malformed events; the next reconnect performs a full refresh.
        }
      })
      onConnected?.()
    },
  })

  client.activate()
  return () => client.deactivate()
}
