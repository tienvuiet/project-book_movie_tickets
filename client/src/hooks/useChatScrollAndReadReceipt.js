import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'

const NEAR_BOTTOM_PX = 100

export function isScrollNearBottom(container, threshold = NEAR_BOTTOM_PX) {
  if (!container) return true
  return container.scrollHeight - container.scrollTop - container.clientHeight <= threshold
}

export function decideMessageScroll({
  conversationChanged,
  lastMessageChanged,
  lastMessageIncoming,
  wasNearBottom,
}) {
  if (conversationChanged) return 'INITIAL_BOTTOM'
  if (!lastMessageChanged) return 'NONE'
  if (lastMessageIncoming && !wasNearBottom) return 'NOTIFY'
  return 'SCROLL_BOTTOM'
}

export default function useChatScrollAndReadReceipt({
  conversationId,
  messages = [],
  lastReadMessageId,
  canMarkRead = true,
  isIncomingMessage,
  onMarkRead,
}) {
  const scrollContainerRef = useRef(null)
  const prependSnapshotRef = useRef(null)
  const previousConversationIdRef = useRef(null)
  const previousLastMessageIdRef = useRef(null)
  const nearBottomRef = useRef(true)
  const readTimerRef = useRef(null)
  const [pendingNewMessages, setPendingNewMessages] = useState(0)

  const lastMessage = messages.at(-1) || null
  const lastIncomingMessage = useMemo(
    () => [...messages].reverse().find((message) => isIncomingMessage(message)) || null,
    [isIncomingMessage, messages],
  )
  const readTargetRef = useRef(null)

  const scrollToBottom = useCallback((behavior = 'smooth') => {
    const container = scrollContainerRef.current
    if (!container) return
    container.scrollTo({ top: container.scrollHeight, behavior })
    nearBottomRef.current = true
    setPendingNewMessages(0)
  }, [])

  const handleScroll = useCallback(() => {
    const nearBottom = isScrollNearBottom(scrollContainerRef.current)
    nearBottomRef.current = nearBottom
    if (nearBottom) setPendingNewMessages(0)
  }, [])

  const captureBeforePrepend = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container) return
    prependSnapshotRef.current = {
      conversationId,
      scrollHeight: container.scrollHeight,
      scrollTop: container.scrollTop,
    }
  }, [conversationId])

  const cancelPrepend = useCallback(() => {
    prependSnapshotRef.current = null
  }, [])

  useLayoutEffect(() => {
    const container = scrollContainerRef.current
    if (!container || !conversationId) return

    const prependSnapshot = prependSnapshotRef.current
    if (prependSnapshot?.conversationId === conversationId) {
      container.scrollTop = prependSnapshot.scrollTop
        + container.scrollHeight - prependSnapshot.scrollHeight
      prependSnapshotRef.current = null
      nearBottomRef.current = isScrollNearBottom(container)
      return
    }
    if (prependSnapshot) prependSnapshotRef.current = null

    const conversationChanged = previousConversationIdRef.current !== conversationId
    const previousLastMessageId = previousLastMessageIdRef.current
    const lastMessageChanged = lastMessage?.id != null
      && Number(lastMessage.id) !== Number(previousLastMessageId || 0)

    const scrollAction = decideMessageScroll({
      conversationChanged,
      lastMessageChanged,
      lastMessageIncoming: isIncomingMessage(lastMessage),
      wasNearBottom: nearBottomRef.current,
    })
    if (scrollAction === 'INITIAL_BOTTOM') {
      scrollToBottom('auto')
    } else if (scrollAction === 'NOTIFY') {
      const newIncomingCount = messages.filter((message) =>
        Number(message.id) > Number(previousLastMessageId || 0) && isIncomingMessage(message)).length
      setPendingNewMessages((current) => current + Math.max(newIncomingCount, 1))
    } else if (scrollAction === 'SCROLL_BOTTOM') {
      scrollToBottom('smooth')
    }

    previousConversationIdRef.current = conversationId
    previousLastMessageIdRef.current = lastMessage?.id || null
  }, [conversationId, isIncomingMessage, lastMessage, messages, scrollToBottom])

  useEffect(() => {
    const container = scrollContainerRef.current
    const target = readTargetRef.current
    const messageId = lastIncomingMessage?.id
    if (!container || !target || !conversationId || !canMarkRead || !messageId
        || Number(messageId) <= Number(lastReadMessageId || 0)) return undefined

    let intersecting = false
    let retryAttempt = 0
    let disposed = false
    const scheduleMarkRead = (delay = 400) => {
      window.clearTimeout(readTimerRef.current)
      if (disposed || !intersecting || document.visibilityState !== 'visible') return
      readTimerRef.current = window.setTimeout(() => {
        void Promise.resolve(onMarkRead(conversationId, messageId)).catch(() => {
          retryAttempt += 1
          if (retryAttempt <= 4) scheduleMarkRead(Math.min(8000, 500 * (2 ** retryAttempt)))
        })
      }, delay)
    }
    const observer = new IntersectionObserver(([entry]) => {
      intersecting = entry.isIntersecting && entry.intersectionRatio >= 0.8
      scheduleMarkRead()
    }, { root: container, threshold: 0.8 })
    const onVisibilityChange = () => scheduleMarkRead()

    observer.observe(target)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      disposed = true
      observer.disconnect()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.clearTimeout(readTimerRef.current)
    }
  }, [canMarkRead, conversationId, lastIncomingMessage?.id, lastReadMessageId, onMarkRead])

  useEffect(() => () => window.clearTimeout(readTimerRef.current), [])

  const getMessageReadTargetRef = useCallback((message) =>
    Number(message?.id) === Number(lastIncomingMessage?.id) ? readTargetRef : undefined,
  [lastIncomingMessage?.id])

  return {
    cancelPrepend,
    captureBeforePrepend,
    getMessageReadTargetRef,
    handleScroll,
    pendingNewMessages,
    scrollContainerRef,
    scrollToBottom,
  }
}
