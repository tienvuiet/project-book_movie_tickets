/**
 * StaffSupportPage.jsx
 * Trang hỗ trợ trực tuyến dành cho nhân viên rạp — layout 3 cột.
 * Dữ liệu mock tĩnh, không cần backend.
 */

import {
  Bell,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Filter,
  Inbox,
  LogOut,
  MapPin,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  Send,
  SlidersHorizontal,
  Ticket,
  User,
  UserCheck,
  WifiOff,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CONVERSATION_STATUS } from '../../data/supportMockData'
import { useAuth } from '../../hooks/useAuth'
import useChatScrollAndReadReceipt from '../../hooks/useChatScrollAndReadReceipt'
import chatService from '../../services/chatService'
import { appendSentMessage, mergeConversationEvent, mergeConversationListEvent, mergeConversationPage, preferNewestConversation, shouldApplyChatEvent, totalUnreadFor } from '../../services/chatEventReducer'
import { subscribeToChatEvents } from '../../services/chatRealtimeService'

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status, small = false }) {
  const meta = CONVERSATION_STATUS[status] || CONVERSATION_STATUS.WAITING
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-semibold ${
        small ? 'px-1.5 py-0.5 text-[9px]' : 'px-2.5 py-1 text-[10px]'
      }`}
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

// ─── Conversation list item ────────────────────────────────────────────────────
function ConvListItem({ conv, isActive, onClick }) {
  const isLongWait = parseInt(conv.waitTime) > 10
  return (
    <button
      onClick={() => onClick(conv)}
      className={`w-full text-left px-4 py-3.5 border-b border-slate-800/80 transition-all duration-150 group ${
        isActive
          ? 'bg-red-500/10 border-l-2 border-l-red-500'
          : 'hover:bg-slate-800/50 border-l-2 border-l-transparent'
      }`}
    >
      {/* Row 1: Avatar + Name + Time */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-2 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center shrink-0 text-[11px] font-bold text-white">
            {conv.customerAvatar}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white leading-none truncate">
              {conv.customerName}
            </p>
            <p className="text-[10px] text-slate-500 mt-0.5">{conv.topic}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-[10px] text-slate-500">{conv.lastMessageTime}</span>
          {conv.unread > 0 && (
            <span className="h-4 min-w-[16px] px-1 rounded-full bg-red-500 text-[9px] font-bold text-white flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>

      {/* Row 2: Last message */}
      <p className="text-[11px] text-slate-400 line-clamp-1 ml-10 mb-2">{conv.lastMessage}</p>

      {/* Row 3: Badges */}
      <div className="flex items-center gap-1.5 ml-10 flex-wrap">
        <StatusBadge status={conv.status} small />
        {isLongWait && conv.status === 'WAITING' && (
          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 border border-red-500/25 text-red-400">
            ⏱ {conv.waitTime}
          </span>
        )}
        {conv.bookingCode && (
          <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
            {conv.bookingCode}
          </span>
        )}
        {conv.assignedName && (
          <span className="text-[9px] text-slate-500 truncate">
            → {conv.assignedName}
          </span>
        )}
      </div>
    </button>
  )
}

// ─── Message bubble (staff view) ──────────────────────────────────────────────
function MsgBubble({ msg, peerLastReadMessageId }) {
  if (msg.type === 'system') {
    return (
      <div className="flex justify-center my-4">
        <span className="rounded-full bg-slate-800 border border-slate-700/50 px-3 py-1 text-[11px] text-slate-400">
          {msg.text}
        </span>
      </div>
    )
  }
  const isStaff = msg.type === 'staff'
  const read = isStaff && Number(msg.id) <= Number(peerLastReadMessageId || 0)
  return (
    <div className={`flex gap-2.5 mb-4 ${isStaff ? 'flex-row-reverse' : ''}`}>
      <div
        className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white mt-0.5 ${
          isStaff
            ? 'bg-gradient-to-br from-red-500 to-orange-600'
            : 'bg-gradient-to-br from-violet-500 to-blue-600'
        }`}
      >
        {isStaff ? 'NV' : msg.sender?.slice(0, 2) || 'KH'}
      </div>
      <div className={`flex flex-col max-w-[70%] ${isStaff ? 'items-end' : ''}`}>
        {!isStaff && (
          <span className="text-[10px] text-slate-500 mb-1">Khách hàng</span>
        )}
        <div
          className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
            isStaff
              ? 'bg-gradient-to-br from-red-500 to-orange-600 text-white rounded-br-sm'
              : 'bg-slate-700/60 text-slate-100 rounded-bl-sm border border-slate-600/40'
          }`}
        >
          {msg.text}
        </div>
        <span className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">{msg.time}{isStaff && (read ? <CheckCheck title="Khách hàng đã đọc" className="h-3 w-3 text-blue-400" /> : <Check title="Đã gửi" className="h-3 w-3" />)}</span>
      </div>
    </div>
  )
}

// ─── Right panel sections ─────────────────────────────────────────────────────
function InfoSection({ title, icon: Icon, children }) {
  const [open, setOpen] = useState(true)
  return (
    <div className="border-b border-slate-800/80">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-300">{title}</span>
        </div>
        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between gap-3 text-xs py-1">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-slate-200 text-right font-medium break-all">{value || '—'}</span>
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = ['Đang chờ', 'Của tôi', 'Đã giải quyết', 'Tất cả']
const isCustomerMessage = (message) => message?.type === 'customer'
const markConversationRead = (conversationId, messageId) => chatService.markRead(conversationId, messageId)

export default function StaffSupportPage() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('Tất cả')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedConv, setSelectedConv] = useState(null)
  const [inputText, setInputText] = useState('')
  const [convList, setConvList] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [actionBusy, setActionBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [staffOnline, setStaffOnline] = useState(false)
  const seenEventIds = useRef(new Set())
  const resyncTimer = useRef(null)
  const selectedConversationIdRef = useRef(null)
  const pendingSendRef = useRef(null)
  const {
    cancelPrepend,
    captureBeforePrepend,
    getMessageReadTargetRef,
    handleScroll,
    pendingNewMessages,
    scrollContainerRef,
    scrollToBottom,
  } = useChatScrollAndReadReceipt({
    conversationId: selectedConv?.id,
    messages: selectedConv?.messages || [],
    lastReadMessageId: selectedConv?.staffLastReadMessageId,
    canMarkRead: selectedConv?.assignedTo === user?.id,
    isIncomingMessage: isCustomerMessage,
    onMarkRead: markConversationRead,
  })

  const cinema = {
    name: user?.cinemaName || 'Rạp chưa được phân công',
    shortAddress: user?.cinemaName ? `Mã rạp: ${user?.cinemaId}` : 'Liên hệ quản trị viên',
    phone: '',
  }

  useEffect(() => {
    selectedConversationIdRef.current = selectedConv?.id || null
  }, [selectedConv?.id])

  const loadConversations = useCallback(async (cursor = null) => {
    setLoading(true); setError('')
    try {
      const page = await chatService.getStaffConversations({ cursor: cursor || undefined, size: 20 })
      setConvList((currentItems) => mergeConversationPage(currentItems, page.items))
      setNextCursor(page.nextCursor || null)
      setHasMore(Boolean(page.hasMore))
      setTotalUnread(Number(page.totalUnread || 0))
    } catch (err) { setError(err.message || 'Không thể tải hàng đợi hỗ trợ') }
    finally { setLoading(false) }
  }, [])

  const resyncConversations = useCallback(async () => {
    try {
      const page = await chatService.getStaffConversations({ size: 20 })
      setConvList(page.items || [])
      setNextCursor(page.nextCursor || null)
      setHasMore(Boolean(page.hasMore))
      setTotalUnread(Number(page.totalUnread || 0))
    } catch { /* Keep current queue state until the next reconciliation. */ }

    const selectedId = selectedConversationIdRef.current
    if (!selectedId) return
    try {
      const detail = await chatService.getConversation(selectedId)
      setSelectedConv((current) => current?.id === selectedId ? detail : current)
    } catch { /* A later reconciliation will retry the detail. */ }
  }, [])

  const scheduleResync = useCallback(() => {
    window.clearTimeout(resyncTimer.current)
    resyncTimer.current = window.setTimeout(() => { void resyncConversations() }, 400)
  }, [resyncConversations])

  useEffect(() => {
    loadConversations()
    const unsubscribe = subscribeToChatEvents((event) => {
      if (!shouldApplyChatEvent(seenEventIds.current, event)) return
      setTotalUnread(totalUnreadFor(event, 'STAFF'))
      setConvList((items) => {
        const result = mergeConversationListEvent(items, event, 'STAFF', user?.id)
        if (result.gap) scheduleResync()
        return result.items
      })
      setSelectedConv((current) => {
        const result = mergeConversationEvent(current, event, 'STAFF', user?.id)
        if (result.gap) scheduleResync()
        return result.conversation
      })
    }, (connected, meta) => {
      setStaffOnline(connected)
      if (meta?.reconnected) scheduleResync()
    }, scheduleResync)
    const reconciliationTimer = window.setInterval(() => { void resyncConversations() }, 30000)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
      window.clearTimeout(resyncTimer.current)
      window.clearInterval(reconciliationTimer)
    }
  }, [loadConversations, resyncConversations, scheduleResync, user?.id])

  // Filter conversations
  const filteredConvs = convList.filter((c) => {
    const q = searchQuery.toLowerCase()
    const matchSearch =
      !q ||
      c.customerName.toLowerCase().includes(q) ||
      c.lastMessage.toLowerCase().includes(q) ||
      (c.bookingCode || '').toLowerCase().includes(q)
    const matchTab =
      activeTab === 'Tất cả' ||
      (activeTab === 'Đang chờ' && c.status === 'WAITING') ||
      (activeTab === 'Của tôi' && c.assignedTo === user?.id) ||
      (activeTab === 'Đã giải quyết' &&
        (c.status === 'RESOLVED' || c.status === 'CLOSED'))
    return matchSearch && matchTab
  })

  // Tab counts
  const tabCount = (tab) => {
    if (tab === 'Đang chờ') return convList.filter((c) => c.status === 'WAITING').length
    if (tab === 'Của tôi') return convList.filter((c) => c.assignedTo === user?.id).length
    if (tab === 'Đã giải quyết')
      return convList.filter(
        (c) => c.status === 'RESOLVED' || c.status === 'CLOSED'
      ).length
    return convList.length
  }

  const replaceConversation = (next) => {
    setSelectedConv((current) => preferNewestConversation(current, next))
    setConvList((items) => items.map((item) => item.id === next.id ? preferNewestConversation(item, next) : item))
  }

  const handleAccept = async () => {
    if (actionBusy) return
    setActionBusy(true)
    setError('')
    try { replaceConversation(await chatService.acceptConversation(selectedConv.id)) }
    catch (err) { setError(err.message || 'Cuộc trò chuyện đã được tiếp nhận'); await loadConversations() }
    finally { setActionBusy(false) }
  }

  const handleResolve = async () => {
    if (actionBusy) return
    setActionBusy(true)
    setError('')
    try { replaceConversation(await chatService.resolveConversation(selectedConv.id)) }
    catch (err) { setError(err.message || 'Không thể hoàn tất cuộc trò chuyện') }
    finally { setActionBusy(false) }
  }

  const handleSend = async () => {
    const text = inputText.trim()
    if (!text || actionBusy) return
    setActionBusy(true)
    setError('')
    try {
      const pending = pendingSendRef.current?.conversationId === selectedConv.id && pendingSendRef.current?.content === text
        ? pendingSendRef.current
        : { conversationId: selectedConv.id, content: text, clientMessageId: globalThis.crypto.randomUUID() }
      pendingSendRef.current = pending
      const delta = await chatService.sendMessage(selectedConv.id, text, pending.clientMessageId)
      pendingSendRef.current = null
      setSelectedConv((current) => appendSentMessage(current, delta))
      setConvList((items) => items
        .map((item) => appendSentMessage(item, delta))
        .sort((a, b) => new Date(b.lastMessageAt || 0) - new Date(a.lastMessageAt || 0) || b.id - a.id))
      setInputText('')
    }
    catch (err) { setError(err.message || 'Không thể gửi tin nhắn') }
    finally { setActionBusy(false) }
  }

  const openConversation = async (conversation) => {
    setError('')
    try {
      const detail = await chatService.getConversation(conversation.id)
      setSelectedConv((current) => preferNewestConversation(current?.id === detail.id ? current : null, detail))
    } catch (err) { setError(err.message || 'Không thể tải cuộc trò chuyện') }
  }

  const loadOlderMessages = async () => {
    if (!selectedConv?.messagesHasMore || actionBusy) return
    captureBeforePrepend()
    setActionBusy(true); setError('')
    try {
      const page = await chatService.getMessages(selectedConv.id, { beforeId: selectedConv.nextBeforeId, size: 30 })
      setSelectedConv((current) => {
        if (!current || current.id !== selectedConv.id) return current
        const currentIds = new Set((current.messages || []).map((message) => message.id))
        return {
          ...current,
          messages: [...page.items.filter((message) => !currentIds.has(message.id)), ...(current.messages || [])],
          nextBeforeId: page.nextBeforeId || null,
          messagesHasMore: Boolean(page.hasMore),
        }
      })
    } catch (err) { cancelPrepend(); setError(err.message || 'Không thể tải tin nhắn cũ') }
    finally { setActionBusy(false) }
  }

  const canReply =
    selectedConv?.status === 'IN_PROGRESS' &&
    selectedConv?.assignedTo === user?.id

  const booking = selectedConv?.booking || null

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -mt-6 -mx-4 lg:-mx-6 overflow-hidden">
      {/* ═══ Page header ═══ */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800/80 bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-xl gradient-brand flex items-center justify-center shrink-0">
            <MessageSquare className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-none">Trung tâm hỗ trợ</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {cinema.name} — {cinema.shortAddress}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
            <Bell className="h-4 w-4" />
            {totalUnread > 0 && <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">{totalUnread > 99 ? '99+' : totalUnread}</span>}
          </button>
          {/* Staff online toggle */}
          <div
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all ${
              staffOnline
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                staffOnline ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              }`}
            />
            {staffOnline ? 'Đang trực' : 'Ngoại tuyến'}
          </div>
          <div className="h-7 w-7 rounded-xl bg-gradient-to-br from-red-500 to-orange-600 flex items-center justify-center text-[11px] font-bold text-white">
            {user?.name?.slice(0, 2) || 'NV'}
          </div>
        </div>
      </div>

      {/* ═══ Three-column layout ═══ */}
      <div className="flex flex-1 overflow-hidden">
        {/* ─── Col 1: Conversation list ─── */}
        <aside className="w-72 xl:w-80 flex flex-col border-r border-slate-800/80 shrink-0 overflow-hidden">
          {/* Search + filter */}
          <div className="px-3 py-3 border-b border-slate-800/60 space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm khách, nội dung, mã vé..."
                className="w-full rounded-xl bg-slate-800/70 border border-slate-700/50 pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/50 transition-all"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-slate-800/60 shrink-0">
            {TABS.map((tab) => {
              const count = tabCount(tab)
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2.5 text-[10px] font-semibold transition-all border-b-2 relative ${
                    activeTab === tab
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {tab}
                  {count > 0 && (
                    <span
                      className={`ml-1 text-[9px] font-bold ${
                        activeTab === tab ? 'text-red-400' : 'text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading && convList.length === 0 ? (
              <div className="flex h-40 items-center justify-center text-xs text-slate-500">Đang tải hàng đợi…</div>
            ) : error ? (
              <div className="flex h-40 flex-col items-center justify-center gap-2 px-4 text-center">
                <p className="text-xs text-red-400">{error}</p>
                <button onClick={loadConversations} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Thử lại</button>
              </div>
            ) : filteredConvs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 px-4">
                <Inbox className="h-8 w-8 text-slate-700" />
                <p className="text-xs text-slate-500 text-center">Không có cuộc trò chuyện nào</p>
              </div>
            ) : (
              filteredConvs.map((conv) => (
                <ConvListItem
                  key={conv.id}
                  conv={conv}
                  isActive={selectedConv?.id === conv.id}
                  onClick={openConversation}
                />
            ))
            )}
            {hasMore && <button type="button" disabled={loading} onClick={() => loadConversations(nextCursor)} className="mx-auto my-3 block rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50">{loading ? 'Đang tải…' : 'Tải thêm'}</button>}
          </div>
        </aside>

        {/* ─── Col 2: Chat area ─── */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {selectedConv.customerAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-white">{selectedConv.customerName}</p>
                    <StatusBadge status={selectedConv.status} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Chủ đề: <span className="text-slate-300">{selectedConv.topic}</span>
                    {selectedConv.assignedName && (
                      <> · Nhân viên:{' '}
                        <span className="text-blue-400">{selectedConv.assignedName}</span>
                      </>
                    )}
                    {' '}· Chờ: <span className="text-amber-400">{selectedConv.waitTime}</span>
                  </p>
                </div>
                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {selectedConv.status === 'WAITING' && (
                    <button
                      onClick={handleAccept}
                      className="flex items-center gap-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-semibold px-3 py-2 hover:bg-blue-500/25 transition-colors"
                    >
                      <UserCheck className="h-3.5 w-3.5" />
                      Tiếp nhận
                    </button>
                  )}
                  {selectedConv.status === 'IN_PROGRESS' && selectedConv.assignedTo === user?.id && (
                    <button
                      onClick={handleResolve}
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold px-3 py-2 hover:bg-emerald-500/25 transition-colors"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                      Đã giải quyết
                    </button>
                  )}
                  {selectedConv.status === 'IN_PROGRESS' && selectedConv.assignedTo !== user?.id && (
                    <div className="flex items-center gap-1.5 rounded-xl bg-slate-700/50 border border-slate-600/50 text-slate-400 text-xs px-3 py-2">
                      <User className="h-3.5 w-3.5" />
                      Đang xử lý bởi {selectedConv.assignedName}
                    </div>
                  )}
                </div>
              </div>

              {/* Messages */}
              <div className="relative min-h-0 flex-1">
                <div ref={scrollContainerRef} onScroll={handleScroll} className="h-full overflow-y-auto px-5 py-4">
                  {selectedConv.messagesHasMore && <button type="button" disabled={actionBusy} onClick={loadOlderMessages} className="mx-auto mb-3 block rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-400 disabled:opacity-50">{actionBusy ? 'Đang tải…' : 'Tải tin nhắn cũ'}</button>}
                  {(selectedConv.messages || []).map((msg) => (
                    <div key={msg.id}><MsgBubble msg={msg} peerLastReadMessageId={selectedConv.customerLastReadMessageId} /><span ref={getMessageReadTargetRef(msg)} aria-hidden="true" className="block h-px" /></div>
                  ))}
                </div>
                {pendingNewMessages > 0 && <button type="button" onClick={() => scrollToBottom('smooth')} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-red-400/30 bg-red-500 px-3 py-1.5 text-xs font-semibold text-white shadow-lg shadow-black/30">↓ {pendingNewMessages} tin nhắn mới</button>}
              </div>

              {/* Input */}
              <div className="border-t border-slate-800/80 bg-slate-900/60 px-5 py-3 shrink-0">
                {!canReply ? (
                  <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-3 text-xs text-slate-400 text-center">
                    {selectedConv.status === 'WAITING'
                      ? 'Tiếp nhận cuộc trò chuyện để bắt đầu trả lời.'
                      : selectedConv.status === 'IN_PROGRESS' && selectedConv.assignedTo !== user?.id
                      ? `Cuộc trò chuyện đang được xử lý bởi ${selectedConv.assignedName}.`
                      : 'Cuộc trò chuyện đã kết thúc.'}
                  </div>
                ) : (
                  <div className="flex items-end gap-2">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleSend()
                        }
                      }}
                      placeholder="Nhập tin nhắn trả lời..."
                      rows={2}
                      className="flex-1 resize-none rounded-xl bg-slate-800/70 border border-slate-700/50 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20 transition-all"
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputText.trim()}
                      className="p-2.5 rounded-xl gradient-brand text-white transition-all hover:brightness-110 active:scale-95 disabled:opacity-40 shrink-0"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3">
              <MessageSquare className="h-12 w-12 text-slate-700" />
              <p className="text-slate-500">Chọn một cuộc trò chuyện để bắt đầu</p>
            </div>
          )}
        </main>

        {/* ─── Col 3: Info panel ─── */}
        <aside className="w-64 xl:w-72 border-l border-slate-800/80 overflow-y-auto shrink-0 hidden lg:block">
          {selectedConv ? (
            <>
              {/* Customer */}
              <InfoSection title="Khách hàng" icon={User}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-blue-600 flex items-center justify-center text-sm font-bold text-white shrink-0">
                    {selectedConv.customerAvatar}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white truncate">{selectedConv.customerName}</p>
                    <p className="text-[10px] text-slate-500">{selectedConv.totalContacts} lần liên hệ</p>
                  </div>
                </div>
                <InfoRow label="Email" value={selectedConv.customerEmail} />
                <InfoRow label="SĐT" value={selectedConv.customerPhone} />
                <button className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                  <ExternalLink className="h-3 w-3" />
                  Xem lịch sử hỗ trợ
                </button>
              </InfoSection>

              {/* Cinema */}
              <InfoSection title="Rạp chiếu phim" icon={MapPin}>
                <InfoRow label="Tên rạp" value={cinema.name} />
                <InfoRow label="Địa chỉ" value={cinema.shortAddress} />
                <InfoRow label="Điện thoại" value={cinema.phone} />
              </InfoSection>

              {/* Booking (if linked) */}
              {booking && (
                <InfoSection title={`Booking ${booking.bookingCode}`} icon={Ticket}>
                  <div className="flex gap-2.5 mb-3">
                    <img
                      src={booking.moviePoster}
                      alt={booking.movieTitle}
                      className="h-14 w-10 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white leading-snug line-clamp-2">
                        {booking.movieTitle}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-1">{booking.showtime}</p>
                    </div>
                  </div>
                  <InfoRow label="Phòng" value={booking.roomName} />
                  <InfoRow label="Ghế" value={booking.seats} />
                  <InfoRow label="Tổng tiền" value={booking.totalPrice} />
                  <InfoRow label="Thanh toán" value={booking.paymentMethod} />
                  <InfoRow label="Trạng thái" value={
                    booking.paymentStatus === 'SUCCESS' ? '✅ Đã thanh toán' : '⏳ Chờ thanh toán'
                  } />
                  <button className="mt-2 text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" />
                    Xem chi tiết booking
                  </button>
                </InfoSection>
              )}

              {/* Request info */}
              <InfoSection title="Thông tin yêu cầu" icon={SlidersHorizontal}>
                <InfoRow label="Nguồn mở chat" value={selectedConv.source} />
                <InfoRow label="Chủ đề" value={selectedConv.topic} />
                <InfoRow label="Thời điểm tạo" value={selectedConv.createdAtLabel} />
                <InfoRow label="Thời gian chờ" value={selectedConv.waitTime} />
                {selectedConv.duration && (
                  <InfoRow label="Thời lượng" value={selectedConv.duration} />
                )}
                <InfoRow
                  label="Người xử lý"
                  value={selectedConv.assignedName || 'Chưa tiếp nhận'}
                />
              </InfoSection>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 px-4">
              <SlidersHorizontal className="h-8 w-8 text-slate-700" />
              <p className="text-xs text-slate-500 text-center">Chọn cuộc trò chuyện để xem thông tin</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
