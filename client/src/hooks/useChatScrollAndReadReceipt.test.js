import { describe, expect, it } from 'vitest'
import { decideMessageScroll, isScrollNearBottom } from './useChatScrollAndReadReceipt'

describe('chat scroll policy', () => {
  it('jumps to the bottom when opening a conversation', () => {
    expect(decideMessageScroll({ conversationChanged: true })).toBe('INITIAL_BOTTOM')
  })

  it('scrolls for a new message when the reader is already near the bottom', () => {
    expect(decideMessageScroll({
      conversationChanged: false,
      lastMessageChanged: true,
      lastMessageIncoming: true,
      wasNearBottom: true,
    })).toBe('SCROLL_BOTTOM')
  })

  it('shows a notification instead of interrupting someone reading history', () => {
    expect(decideMessageScroll({
      conversationChanged: false,
      lastMessageChanged: true,
      lastMessageIncoming: true,
      wasNearBottom: false,
    })).toBe('NOTIFY')
  })

  it('does not scroll for metadata-only conversation updates', () => {
    expect(decideMessageScroll({
      conversationChanged: false,
      lastMessageChanged: false,
    })).toBe('NONE')
  })

  it('uses a small tolerance when detecting the bottom', () => {
    expect(isScrollNearBottom({ scrollHeight: 1000, scrollTop: 410, clientHeight: 500 })).toBe(true)
    expect(isScrollNearBottom({ scrollHeight: 1000, scrollTop: 300, clientHeight: 500 })).toBe(false)
  })
})
