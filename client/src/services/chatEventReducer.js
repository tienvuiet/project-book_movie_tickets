import { toUiConversation, toUiMessage } from './chatService'

const boundedRemember = (seen, eventId) => {
  if (!eventId || seen.has(eventId)) return false
  if (seen.size >= 1000) seen.clear()
  seen.add(eventId)
  return true
}

const versionOf = (value) => Number(value?.version || 0)

const unreadFor = (event, role, userId) => {
  if (role === 'CUSTOMER') return Number(event.customerUnreadCount || 0)
  const assignedStaffId = event.summary?.assignedStaffId
  if (!assignedStaffId) return Number(event.queueUnreadCount || 0)
  return Number(assignedStaffId) === Number(userId) ? Number(event.staffUnreadCount || 0) : 0
}

export const totalUnreadFor = (event, role) => role === 'CUSTOMER'
  ? Number(event.customerTotalUnread || 0)
  : Number(event.staffTotalUnread || 0)

function eventSummary(event, role, userId) {
  if (!event?.summary) return null
  const mapped = toUiConversation({
    ...event.summary,
    unreadCount: unreadFor(event, role, userId),
    version: event.conversationVersion ?? event.summary.version,
  })
  const summary = { ...mapped }
  delete summary.messages
  delete summary.booking
  delete summary.nextBeforeId
  delete summary.messagesHasMore
  return summary
}

export function shouldApplyChatEvent(seen, event) {
  return Boolean(event?.conversationId && event?.summary && boundedRemember(seen, event.eventId))
}

export function mergeConversationEvent(current, event, role, userId) {
  if (!current || current.id !== event.conversationId) return { conversation: current, gap: false }
  const incomingVersion = Number(event.conversationVersion || event.summary?.version || 0)
  const currentVersion = versionOf(current)
  if (incomingVersion && currentVersion > incomingVersion) return { conversation: current, gap: false }

  const summary = eventSummary(event, role, userId)
  const gap = Boolean(currentVersion && incomingVersion > currentVersion + 1)
  let messages = current.messages || []
  if (event.message && !messages.some((item) => item.id === event.message.id)) {
    messages = [...messages, toUiMessage(event.message)]
  }
  return { conversation: { ...current, ...summary, messages }, gap }
}

export function mergeConversationListEvent(items, event, role, userId) {
  const summary = eventSummary(event, role, userId)
  if (!summary) return { items, gap: false }
  const current = items.find((item) => item.id === event.conversationId)
  const incomingVersion = versionOf(summary)
  const currentVersion = versionOf(current)
  if (current && incomingVersion && currentVersion > incomingVersion) return { items, gap: false }

  const gap = Boolean(currentVersion && incomingVersion > currentVersion + 1)
  const next = current
    ? items.map((item) => item.id === event.conversationId ? { ...item, ...summary } : item)
    : [{ ...summary, messages: [] }, ...items]
  next.sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0) || b.id - a.id)
  return { items: next, gap }
}

export function preferNewestConversation(current, incoming) {
  if (!current) return incoming
  if (!incoming) return current
  return versionOf(current) > versionOf(incoming) ? current : incoming
}

export function appendSentMessage(current, delta) {
  if (!current || !delta || Number(current.id) !== Number(delta.conversationId)) return current

  const currentMessages = current.messages || []
  const message = delta.message
  const messages = !message || currentMessages.some((item) => Number(item.id) === Number(message.id))
    ? currentMessages
    : [...currentMessages, message].sort((a, b) => Number(a.id) - Number(b.id))

  return {
    ...current,
    version: Math.max(versionOf(current), Number(delta.conversationVersion || 0)),
    lastMessageAt: delta.lastMessageAt || current.lastMessageAt,
    lastMessage: delta.lastMessageContent || current.lastMessage,
    lastMessageTime: delta.lastMessageTime || current.lastMessageTime,
    messages,
  }
}

export function mergeConversationPage(currentItems, incomingItems) {
  const byId = new Map(currentItems.map((item) => [item.id, item]))
  incomingItems.forEach((item) => byId.set(item.id, preferNewestConversation(byId.get(item.id), item)))
  return [...byId.values()].sort((a, b) =>
    new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0) || b.id - a.id)
}
