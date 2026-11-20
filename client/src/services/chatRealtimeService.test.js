import { afterEach, describe, expect, it, vi } from 'vitest'
import { handleChatEventFrame } from './chatRealtimeService'

const validEvent = () => ({
  eventId: 'event-1',
  type: 'MESSAGE_CREATED',
  conversationId: 10,
  conversationVersion: 3,
  summary: { id: 10, version: 3 },
})

describe('chatRealtimeService', () => {
  afterEach(() => vi.restoreAllMocks())

  it('delivers a compatible event', () => {
    const onEvent = vi.fn()
    const onInvalidEvent = vi.fn()

    handleChatEventFrame(JSON.stringify(validEvent()), onEvent, onInvalidEvent)

    expect(onEvent).toHaveBeenCalledWith(validEvent())
    expect(onInvalidEvent).not.toHaveBeenCalled()
  })

  it('requests a resync for malformed JSON without logging its body', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onInvalidEvent = vi.fn()
    const sensitiveBody = '{"content":"secret message"'

    handleChatEventFrame(sensitiveBody, vi.fn(), onInvalidEvent)

    expect(onInvalidEvent).toHaveBeenCalledWith({ reason: 'invalid_json' })
    expect(JSON.stringify(warn.mock.calls)).not.toContain('secret message')
  })

  it('requests a resync for an incompatible schema', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onInvalidEvent = vi.fn()

    handleChatEventFrame(JSON.stringify({ ...validEvent(), summary: null }), vi.fn(), onInvalidEvent)

    expect(onInvalidEvent).toHaveBeenCalledWith({ reason: 'missing_summary' })
  })

  it('requests a resync when the consumer fails to apply an event', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const onInvalidEvent = vi.fn()

    handleChatEventFrame(JSON.stringify(validEvent()), () => { throw new Error('reducer failed') }, onInvalidEvent)

    expect(onInvalidEvent).toHaveBeenCalledWith({ reason: 'event_handler_failed' })
  })
})
