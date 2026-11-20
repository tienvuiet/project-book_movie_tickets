import { describe, expect, it } from 'vitest'
import { appendSentMessage, mergeConversationEvent, mergeConversationListEvent, shouldApplyChatEvent } from './chatEventReducer'

const summary = (version = 2) => ({
  id: 10,
  version,
  customerId: 1,
  customerName: 'Khách hàng',
  cinemaId: 5,
  cinemaName: 'Rạp 1',
  assignedStaffId: 20,
  subject: 'BOOKING',
  sourcePage: 'HOME',
  status: 'IN_PROGRESS',
  lastMessageAt: '2026-07-22T16:30:00',
  lastMessageContent: 'Tin nhắn mới',
})

const event = (version = 2) => ({
  eventId: `event-${version}`,
  type: 'MESSAGE_CREATED',
  conversationId: 10,
  conversationVersion: version,
  summary: summary(version),
  message: { id: 99, senderRole: 'CUSTOMER', senderName: 'Khách hàng', content: 'Tin nhắn mới', createdAt: '2026-07-22T16:30:00' },
  customerUnreadCount: 0,
  staffUnreadCount: 1,
})

describe('chatEventReducer', () => {
  it('inserts a new summary without an HTTP refresh', () => {
    const result = mergeConversationListEvent([], event(), 'STAFF', 20)
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toMatchObject({ id: 10, version: 2, unread: 1, lastMessage: 'Tin nhắn mới' })
  })

  it('appends a message once and ignores the same version', () => {
    const current = { ...summary(1), messages: [] }
    const first = mergeConversationEvent(current, event(2), 'STAFF', 20).conversation
    const duplicate = mergeConversationEvent(first, event(2), 'STAFF', 20).conversation
    expect(first.messages).toHaveLength(1)
    expect(duplicate.messages).toHaveLength(1)
  })

  it('appends an HTTP send delta once and lets the same-version event update unread state', () => {
    const current = { ...summary(1), messages: [], unread: 0 }
    const delta = {
      conversationId: 10,
      conversationVersion: 2,
      lastMessageAt: '2026-07-22T16:30:00',
      message: { id: 99, type: 'customer', sender: 'Khách hàng', text: 'Tin nhắn mới', time: '16:30', status: 'sent' },
    }

    const afterHttp = appendSentMessage(current, delta)
    const afterHttpDuplicate = appendSentMessage(afterHttp, delta)
    const afterEvent = mergeConversationEvent(afterHttpDuplicate, event(2), 'STAFF', 20).conversation

    expect(afterHttpDuplicate.messages).toHaveLength(1)
    expect(afterEvent.messages).toHaveLength(1)
    expect(afterEvent.unread).toBe(1)
  })

  it('detects a missing conversation version', () => {
    const current = { ...summary(1), messages: [] }
    expect(mergeConversationEvent(current, event(4), 'STAFF', 20).gap).toBe(true)
  })

  it('deduplicates repeated event ids', () => {
    const seen = new Set()
    expect(shouldApplyChatEvent(seen, event())).toBe(true)
    expect(shouldApplyChatEvent(seen, event())).toBe(false)
  })

  it('does not expose another assigned staff unread count', () => {
    const result = mergeConversationListEvent([], event(), 'STAFF', 21)
    expect(result.items[0].unread).toBe(0)
  })

  it('uses the shared queue unread count before assignment', () => {
    const queueEvent = {
      ...event(),
      summary: { ...summary(), assignedStaffId: null },
      queueUnreadCount: 7,
    }
    const result = mergeConversationListEvent([], queueEvent, 'STAFF', 21)
    expect(result.items[0].unread).toBe(7)
  })
})
