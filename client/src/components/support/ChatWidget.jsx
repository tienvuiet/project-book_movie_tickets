import { MessageCircleMore, X } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import chatService from '../../services/chatService'
import { subscribeToChatEvents } from '../../services/chatRealtimeService'
import { mergeConversationEvent, mergeConversationListEvent, mergeConversationPage, preferNewestConversation, shouldApplyChatEvent, totalUnreadFor } from '../../services/chatEventReducer'
import ChatWindow from './ChatWindow'
import CinemaPickerStep from './steps/CinemaPickerStep'
import BrandLogo from '../BrandLogo'
import MyConversationsPanel from './MyConversationsPanel'
import TopicPickerStep from './steps/TopicPickerStep'

const VIEW = { IDLE: 'IDLE', MY_CONVERSATIONS: 'MY_CONVERSATIONS', PICK_CINEMA: 'PICK_CINEMA', PICK_TOPIC: 'PICK_TOPIC', CHAT: 'CHAT' }

function routeContext(pathname) {
  let match = pathname.match(/^\/booking\/(\d+)/)
  if (match) return { showtimeId: Number(match[1]), contextSource: 'seat-select' }
  match = pathname.match(/^\/payment\/(\d+)/)
  if (match) return { bookingId: Number(match[1]), contextSource: 'payment' }
  match = pathname.match(/^\/success\/(\d+)/)
  if (match) return { bookingId: Number(match[1]), contextSource: 'booking-detail' }
  return null
}

const normalizeCinema = (cinema) => ({
  ...cinema,
  shortAddress: cinema.shortAddress || cinema.address,
  distanceKm: Number(cinema.distanceKm),
  distance: Number.isFinite(Number(cinema.distanceKm)) ? `${Number(cinema.distanceKm).toFixed(1)} km` : '',
})

export default function ChatWidget({ cinemaId = null, bookingId = null, contextSource = null, onOpenChange }) {
  const { isAuthenticated, roles } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)

  const setOpenAndNotify = (value) => {
    const next = typeof value === 'function' ? value(open) : value
    setOpen(next)
    onOpenChange?.(next)
  }
  const [view, setView] = useState(VIEW.IDLE)
  const [selectedCinema, setSelectedCinema] = useState(null)
  const [selectedTopic, setSelectedTopic] = useState(null)
  const [selectedConversation, setSelectedConversation] = useState(null)
  const [context, setContext] = useState(null)
  const [cinemas, setCinemas] = useState([])
  const [conversations, setConversations] = useState([])
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [totalUnread, setTotalUnread] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const seenEventIds = useRef(new Set())
  const resyncTimer = useRef(null)
  const selectedConversationIdRef = useRef(null)
  const normalizedRoles = useMemo(
    () => (Array.isArray(roles) ? roles : []).map((role) => String(role).replace(/^ROLE_/i, '').toUpperCase()),
    [roles],
  )
  const isCustomer = normalizedRoles.includes('CUSTOMER')

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversation?.id || null
  }, [selectedConversation?.id])

  useEffect(() => {
    if (!isAuthenticated || !isCustomer) return
    chatService.getUnreadCount().then((result) => setTotalUnread(Number(result?.totalUnread || 0))).catch(() => {})
  }, [isAuthenticated, isCustomer])

  const inferred = useMemo(() => routeContext(location.pathname), [location.pathname])
  const activeContext = useMemo(() => ({
    cinemaId: cinemaId || undefined,
    bookingId: bookingId || inferred?.bookingId,
    showtimeId: inferred?.showtimeId,
    contextSource: contextSource || inferred?.contextSource || 'home',
  }), [bookingId, cinemaId, contextSource, inferred])

  const loadConversations = useCallback(async (cursor = null) => {
    setLoading(true); setError('')
    try {
      const page = await chatService.getMyConversations({ cursor: cursor || undefined, size: 20 })
      setConversations((items) => mergeConversationPage(items, page.items))
      setNextCursor(page.nextCursor || null)
      setHasMore(Boolean(page.hasMore))
      setTotalUnread(Number(page.totalUnread || 0))
    }
    catch (err) { setError(err.message || 'Không thể tải cuộc trò chuyện') }
    finally { setLoading(false) }
  }, [])

  const resyncConversations = useCallback(async () => {
    try {
      const page = await chatService.getMyConversations({ size: 20 })
      setConversations(page.items || [])
      setNextCursor(page.nextCursor || null)
      setHasMore(Boolean(page.hasMore))
      setTotalUnread(Number(page.totalUnread || 0))
    } catch { /* Keep the current state and retry on the next reconciliation. */ }

    const selectedId = selectedConversationIdRef.current
    if (!selectedId) return
    try {
      const detail = await chatService.getConversation(selectedId)
      setSelectedConversation((current) => current?.id === selectedId ? detail : current)
    } catch { /* The list refresh above is still useful if detail refresh fails. */ }
  }, [])

  const scheduleResync = useCallback(() => {
    window.clearTimeout(resyncTimer.current)
    resyncTimer.current = window.setTimeout(() => { void resyncConversations() }, 400)
  }, [resyncConversations])

  const loadCinemas = useCallback(async () => {
    setLoading(true); setError('')
    try { setCinemas((await chatService.getCinemas() || []).map(normalizeCinema)) }
    catch (err) { setError(err.message || 'Không thể tải danh sách rạp') }
    finally { setLoading(false) }
  }, [])

  const prepareContext = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const result = await chatService.getContext(activeContext)
      setContext(result)
      setSelectedCinema(normalizeCinema({ id: result.cinemaId, name: result.cinemaName, address: result.cinemaAddress, phone: result.cinemaPhone, online: result.staffOnline }))
      const inferredTopic = activeContext.contextSource === 'payment'
        ? { id: 'payment', label: 'Thanh toán' }
        : activeContext.contextSource === 'seat-select'
          ? { id: 'seat', label: 'Ghế ngồi' }
          : { id: 'booking', label: 'Đặt vé' }
      setSelectedTopic(inferredTopic)
      setView(VIEW.CHAT)
    } catch (err) { setError(err.message || 'Không thể xác định rạp'); setView(VIEW.MY_CONVERSATIONS) }
    finally { setLoading(false) }
  }, [activeContext])

  useEffect(() => {
    if (!isAuthenticated || !isCustomer) return undefined
    const unsubscribe = subscribeToChatEvents((event) => {
      if (!shouldApplyChatEvent(seenEventIds.current, event)) return
      setTotalUnread(totalUnreadFor(event, 'CUSTOMER'))
      setConversations((items) => {
        const result = mergeConversationListEvent(items, event, 'CUSTOMER')
        if (result.gap) scheduleResync()
        return result.items
      })
      setSelectedConversation((current) => {
        const result = mergeConversationEvent(current, event, 'CUSTOMER')
        if (result.gap) scheduleResync()
        return result.conversation
      })
    }, (_connected, meta) => {
      if (meta?.reconnected) scheduleResync()
    }, scheduleResync)
    const reconciliationTimer = window.setInterval(() => { void resyncConversations() }, 30000)
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe()
      window.clearTimeout(resyncTimer.current)
      window.clearInterval(reconciliationTimer)
    }
  }, [isAuthenticated, isCustomer, resyncConversations, scheduleResync])

  const handleOpen = async () => {
    if (!isAuthenticated) { navigate('/login', { state: { from: location.pathname } }); return }
    if (!isCustomer) return
    setOpenAndNotify(true)
    if (view !== VIEW.IDLE) return
    if (activeContext.cinemaId || activeContext.bookingId || activeContext.showtimeId) await prepareContext()
    else { setView(VIEW.MY_CONVERSATIONS); await loadConversations() }
  }

  if (isAuthenticated && !isCustomer) return null

  return <>
    <div className="fixed bottom-5 right-4 z-50 sm:bottom-5 sm:right-5">
      <button onClick={open ? () => setOpenAndNotify(false) : handleOpen} aria-label={open ? 'Đóng chat hỗ trợ' : 'Mở chat hỗ trợ'} className={`relative flex h-14 w-14 items-center justify-center rounded-2xl shadow-xl transition-all ${open ? 'bg-slate-700 text-white sm:flex hidden' : 'gradient-brand text-white'}`}>
        {open ? <X className="h-5 w-5" /> : <MessageCircleMore className="h-6 w-6" />}
        {!open && totalUnread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-slate-950">{totalUnread > 99 ? '99+' : totalUnread}</span>}
      </button>
    </div>
    {open && <div className="fixed inset-0 z-50 flex flex-col overflow-hidden border-0 bg-slate-900 shadow-2xl sm:inset-auto sm:bottom-20 sm:right-5 sm:h-[660px] sm:w-[400px] sm:rounded-2xl sm:border sm:border-slate-700/60" style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
      {/* Mobile-only top bar with close button */}
      <div className="flex items-center justify-between border-b border-slate-700/50 bg-slate-900/95 px-4 py-3 sm:hidden">
        <div className="flex items-center gap-2.5">
          <BrandLogo />
          <span className="text-sm font-bold text-white">Chat hỗ trợ</span>
        </div>
        <button onClick={() => setOpenAndNotify(false)} aria-label="Đóng chat" className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-700/60 text-slate-300 hover:bg-slate-600 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      {view === VIEW.MY_CONVERSATIONS && <MyConversationsPanel conversations={conversations} loading={loading} error={error} onRetry={() => loadConversations()} hasMore={hasMore} onLoadMore={() => loadConversations(nextCursor)} onOpen={async (conversation) => { const detail = await chatService.getConversation(conversation.id); setSelectedConversation((current) => preferNewestConversation(current?.id === detail.id ? current : null, detail)); setSelectedCinema(normalizeCinema({ id: detail.cinemaId, name: detail.cinemaName, address: detail.cinemaAddress, phone: detail.cinemaPhone })); setContext({ booking: detail.booking, bookingId: detail.booking?.id }); setView(VIEW.CHAT) }} onNewChat={async () => { setSelectedConversation(null); setSelectedCinema(null); setSelectedTopic(null); setContext(null); setView(VIEW.PICK_CINEMA); await loadCinemas() }} />}
      {view === VIEW.PICK_CINEMA && <CinemaPickerStep cinemas={cinemas} loading={loading} error={error} onRetry={loadCinemas} onSelect={setSelectedCinema} onConfirm={async (cinema) => { setLoading(true); try { const result = await chatService.getContext({ cinemaId: cinema.id }); setContext(result); setSelectedCinema({ ...cinema, online: result.staffOnline }); setView(VIEW.PICK_TOPIC) } catch (err) { setError(err.message) } finally { setLoading(false) } }} />}
      {view === VIEW.PICK_TOPIC && <TopicPickerStep cinema={selectedCinema} onBack={() => setView(VIEW.PICK_CINEMA)} onConfirm={(topic) => { setSelectedTopic(topic); setView(VIEW.CHAT) }} />}
      {view === VIEW.CHAT && <ChatWindow cinema={selectedCinema} topic={selectedTopic} context={context} contextSource={activeContext.contextSource} conversation={selectedConversation} onConversationChange={(next) => { setSelectedConversation((current) => preferNewestConversation(current, next)); setConversations((items) => { const current = items.find((item) => item.id === next.id); const preferred = preferNewestConversation(current, next); return [preferred, ...items.filter((item) => item.id !== next.id)] }) }} onBack={async () => { setView(VIEW.MY_CONVERSATIONS); await loadConversations() }} onClose={() => setOpenAndNotify(false)} />}
    </div>}
    {open && <div className="fixed inset-0 z-40 bg-black/60 sm:hidden" onClick={() => setOpenAndNotify(false)} />}
  </>
}
