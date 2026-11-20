import { AlertTriangle, Check, CheckCheck, ChevronLeft, Info, Paperclip, Send, ThumbsDown, ThumbsUp, Ticket, X } from 'lucide-react'
import BrandLogo from '../BrandLogo'
import { useEffect, useRef, useState } from 'react'
import { CONVERSATION_STATUS } from '../../data/supportMockData'
import useChatScrollAndReadReceipt from '../../hooks/useChatScrollAndReadReceipt'
import chatService, { CHAT_SOURCES, CHAT_SUBJECTS } from '../../services/chatService'
import { appendSentMessage, preferNewestConversation } from '../../services/chatEventReducer'

const isStaffMessage = (message) => message?.type === 'staff'
const markConversationRead = (conversationId, messageId) => chatService.markRead(conversationId, messageId)

function StatusBadge({ status }) {
  const meta = CONVERSATION_STATUS[status] || CONVERSATION_STATUS.WAITING
  return <span className="flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold" style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}>
    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />{meta.label}
  </span>
}

function MessageBubble({ msg, peerLastReadMessageId }) {
  if (msg.type === 'system') return <div className="my-3 flex justify-center"><span className="rounded-full border border-slate-700/50 bg-slate-800/80 px-3 py-1 text-center text-[10px] text-slate-400">{msg.text}</span></div>
  const customer = msg.type === 'customer'
  const read = customer && Number(msg.id) <= Number(peerLastReadMessageId || 0)
  return <div className={`mb-3 flex gap-2 ${customer ? 'flex-row-reverse' : ''}`}>
    {!customer && <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full gradient-brand text-[10px] font-bold text-white">NV</div>}
    <div className={`flex max-w-[78%] flex-col ${customer ? 'items-end' : 'items-start'}`}>
      {!customer && <span className="mb-1 ml-1 text-[10px] text-slate-500">{msg.sender || 'Nhân viên rạp'}</span>}
      <div className={`rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${customer ? 'rounded-br-sm gradient-brand text-white' : 'rounded-bl-sm border border-slate-600/40 bg-slate-700/60 text-slate-100'}`}>{msg.text}</div>
      <div className="mt-1 flex items-center gap-1.5"><span className="text-[10px] text-slate-500">{msg.time}</span>{customer && (read ? <CheckCheck title="Nhân viên đã đọc" className="h-3 w-3 text-blue-400" /> : <Check title="Đã gửi" className="h-3 w-3 text-slate-500" />)}</div>
    </div>
  </div>
}

function BookingContextCard({ booking }) {
  const [expanded, setExpanded] = useState(false)
  return <div className="mx-4 mb-3 overflow-hidden rounded-xl border border-slate-700/50 bg-slate-800/70">
    <button onClick={() => setExpanded((value) => !value)} className="flex w-full items-center gap-3 px-3.5 py-2.5 hover:bg-slate-700/30">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/20"><Ticket className="h-3.5 w-3.5 text-amber-400" /></div>
      <div className="min-w-0 flex-1 text-left"><p className="text-xs font-semibold text-slate-200">Liên kết với vé {booking.bookingCode}</p><p className="truncate text-[10px] text-slate-500">{booking.movieTitle}</p></div>
      <Info className="h-3.5 w-3.5 text-slate-500" />
    </button>
    {expanded && <div className="space-y-1.5 border-t border-slate-700/50 px-3.5 pb-3 pt-2">
      {[['Rạp', booking.cinemaName], ['Suất chiếu', booking.showtime], ['Phòng', booking.roomName], ['Ghế', booking.seats], ['Tổng tiền', booking.totalPrice], ['Thanh toán', booking.paymentMethod]].map(([label, value]) => <div key={label} className="flex justify-between gap-3 text-xs"><span className="text-slate-500">{label}</span><span className="text-right font-medium text-slate-200">{value || '—'}</span></div>)}
    </div>}
  </div>
}

function NoStaffBanner({ cinemaName }) {
  return <div className="mx-4 mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3">
    <p className="text-xs font-semibold text-amber-400">Hiện chưa có nhân viên trực tuyến</p>
    <p className="mt-1 text-[10px] leading-relaxed text-amber-400/70">Tin nhắn của bạn vẫn được gửi đến {cinemaName}. Nhân viên sẽ phản hồi ngay khi có thể.</p>
  </div>
}

function ResolutionCard({ onResolved, onContinue, busy }) {
  return <div className="mx-0 mb-3 rounded-xl border border-slate-700/50 bg-slate-800/70 px-4 py-3.5">
    <p className="mb-1 text-sm font-semibold text-white">Vấn đề của bạn đã được giải quyết chưa?</p>
    <p className="mb-3 text-xs text-slate-400">Nhân viên đã đánh dấu cuộc trò chuyện là hoàn tất.</p>
    <div className="flex gap-2">
      <button disabled={busy} onClick={onResolved} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/15 py-2.5 text-xs font-semibold text-emerald-400 disabled:opacity-50"><ThumbsUp className="h-3.5 w-3.5" />Đã giải quyết</button>
      <button disabled={busy} onClick={onContinue} className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-600/50 bg-slate-700/50 py-2.5 text-xs font-semibold text-slate-300 disabled:opacity-50"><ThumbsDown className="h-3.5 w-3.5" />Vẫn cần hỗ trợ</button>
    </div>
  </div>
}

export default function ChatWindow({ cinema, topic, context, contextSource, conversation, onConversationChange, onBack, onClose }) {
  const [activeConversation, setActiveConversation] = useState(conversation || null)
  const [inputText, setInputText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const pendingSendRef = useRef(null)
  const charLimit = 500
  const status = activeConversation?.status || 'WAITING'
  const messages = activeConversation?.messages || []
  const {
    cancelPrepend,
    captureBeforePrepend,
    getMessageReadTargetRef,
    handleScroll,
    pendingNewMessages,
    scrollContainerRef,
    scrollToBottom,
  } = useChatScrollAndReadReceipt({
    conversationId: activeConversation?.id,
    messages,
    lastReadMessageId: activeConversation?.customerLastReadMessageId,
    isIncomingMessage: isStaffMessage,
    onMarkRead: markConversationRead,
  })

  useEffect(() => {
    setActiveConversation(conversation || null)
  }, [conversation])

  const booking = activeConversation?.booking || context?.booking
  const closed = status === 'CLOSED'
  const commit = (next) => {
    setActiveConversation((current) => {
      const preferred = preferNewestConversation(current, next)
      onConversationChange?.(preferred)
      return preferred
    })
  }

  const send = async () => {
    const content = inputText.trim()
    if (!content || busy || closed || status === 'RESOLVED') return
    setBusy(true); setError('')
    try {
      if (!activeConversation) {
        const created = await chatService.createConversation({ cinemaId: cinema?.id, bookingId: context?.bookingId || booking?.id || null, subject: CHAT_SUBJECTS[topic?.id] || 'OTHER', sourcePage: CHAT_SOURCES[contextSource] || 'HOME', content })
        setInputText(''); commit(created)
        return
      }

      const pending = pendingSendRef.current?.conversationId === activeConversation.id && pendingSendRef.current?.content === content
        ? pendingSendRef.current
        : { conversationId: activeConversation.id, content, clientMessageId: globalThis.crypto.randomUUID() }
      pendingSendRef.current = pending
      const delta = await chatService.sendMessage(activeConversation.id, content, pending.clientMessageId)
      pendingSendRef.current = null
      setInputText('')
      setActiveConversation((current) => {
        const next = appendSentMessage(current, delta)
        onConversationChange?.(next)
        return next
      })
    } catch (err) { setError(err.message || 'Không thể gửi tin nhắn') }
    finally { setBusy(false) }
  }

  const transition = async (action) => {
    setBusy(true); setError('')
    try { commit(await action(activeConversation.id)) }
    catch (err) { setError(err.message || 'Không thể cập nhật cuộc trò chuyện') }
    finally { setBusy(false) }
  }

  const loadOlderMessages = async () => {
    if (!activeConversation?.messagesHasMore || busy) return
    captureBeforePrepend()
    setBusy(true); setError('')
    try {
      const page = await chatService.getMessages(activeConversation.id, { beforeId: activeConversation.nextBeforeId, size: 30 })
      setActiveConversation((current) => {
        if (!current || current.id !== activeConversation.id) return current
        const currentIds = new Set((current.messages || []).map((message) => message.id))
        const next = {
          ...current,
          messages: [...page.items.filter((message) => !currentIds.has(message.id)), ...(current.messages || [])],
          nextBeforeId: page.nextBeforeId || null,
          messagesHasMore: Boolean(page.hasMore),
        }
        onConversationChange?.(next)
        return next
      })
    } catch (err) { cancelPrepend(); setError(err.message || 'Không thể tải tin nhắn cũ') }
    finally { setBusy(false) }
  }

  return <div className="flex h-full flex-col">
    <div className="flex items-center gap-3 border-b border-slate-700/50 bg-slate-900/80 px-4 py-3">
      <button onClick={onBack} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700/60 hover:text-white"><ChevronLeft className="h-4 w-4" /></button>
      <BrandLogo />
      <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold leading-none text-white">{cinema?.name || 'Hỗ trợ trực tuyến'}</p><StatusBadge status={status} /></div><p className="mt-1 text-[10px] text-slate-400">{activeConversation?.assignedStaffName ? <>Đang hỗ trợ bởi <span className="font-medium text-blue-400">{activeConversation.assignedStaffName}</span></> : 'Nhân viên sẽ phản hồi sớm nhất có thể'}</p></div>
      <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-700/60 hover:text-white"><X className="h-4 w-4" /></button>
    </div>
    {cinema?.online === false && status === 'WAITING' && <div className="pt-3"><NoStaffBanner cinemaName={cinema?.name} /></div>}
    {booking && <div className="pt-3"><BookingContextCard booking={booking} /></div>}
    {error && <div className="mx-4 mb-2 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400"><AlertTriangle className="h-3.5 w-3.5" />{error}</div>}
    <div className="relative min-h-0 flex-1">
      <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-4 py-3">
        {activeConversation?.messagesHasMore && <button type="button" disabled={busy} onClick={loadOlderMessages} className="mx-auto mb-3 block rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-50">{busy ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
        {messages.map((message) => <div key={message.id}><MessageBubble msg={message} peerLastReadMessageId={activeConversation?.staffLastReadMessageId} /><span ref={getMessageReadTargetRef(message)} aria-hidden="true" className="block h-px" /></div>)}
        {!activeConversation && <div className="mx-auto mt-8 max-w-xs text-center text-xs leading-relaxed text-slate-500">Hãy nhập câu hỏi đầu tiên. Yêu cầu sẽ được chuyển đúng đến {cinema?.name}.</div>}
        {status === 'RESOLVED' && <ResolutionCard busy={busy} onResolved={() => transition(chatService.closeConversation)} onContinue={() => transition(chatService.reopenConversation)} />}
      </div>
      {pendingNewMessages > 0 && <button type="button" onClick={() => scrollToBottom('smooth')} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-red-400/30 bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-black/30">↓ {pendingNewMessages} tin nhắn mới</button>}
    </div>
    {closed && <div className="mx-4 mb-3 rounded-xl border border-slate-700/50 bg-slate-800/70 px-4 py-3 text-center text-xs text-slate-400">Cuộc trò chuyện đã đóng. Hãy quay lại và tạo yêu cầu hỗ trợ mới nếu cần.</div>}
    {!closed && status !== 'RESOLVED' && <div className="border-t border-slate-700/50 bg-slate-900/60 px-4 py-3">
      {inputText.length > charLimit * 0.8 && <p className={`mb-1 text-right text-[10px] ${inputText.length >= charLimit ? 'text-red-400' : 'text-amber-400'}`}>{inputText.length}/{charLimit}</p>}
      <div className="flex items-end gap-2">
        <button disabled title="Đính kèm ảnh (sắp có)" className="cursor-not-allowed rounded-xl p-2 text-slate-500 opacity-50"><Paperclip className="h-4 w-4" /></button>
        <textarea value={inputText} onChange={(event) => setInputText(event.target.value.slice(0, charLimit))} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); send() } }} placeholder={status === 'WAITING' ? 'Nhập nội dung cần hỗ trợ… (đang chờ nhân viên)' : 'Nhập nội dung cần hỗ trợ…'} rows={1} className="max-h-24 min-h-10 flex-1 resize-none overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-800/70 px-3.5 py-2.5 text-sm leading-relaxed text-white outline-none placeholder:text-slate-500 focus:border-red-500/50" />
        <button onClick={send} disabled={!inputText.trim() || busy} className="rounded-xl p-2.5 gradient-brand text-white disabled:opacity-40"><Send className="h-4 w-4" /></button>
      </div>
    </div>}
  </div>
}
