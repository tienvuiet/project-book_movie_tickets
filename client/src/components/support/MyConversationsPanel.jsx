import { MessageSquare, SlidersHorizontal } from 'lucide-react'
import { useState } from 'react'
import { CONVERSATION_STATUS } from '../../data/supportMockData'

const FILTERS = [
  { id: 'all', label: 'Tất cả' },
  { id: 'active', label: 'Đang hỗ trợ' },
  { id: 'done', label: 'Đã hoàn tất' },
]

function StatusDot({ status }) {
  const meta = CONVERSATION_STATUS[status] || CONVERSATION_STATUS.WAITING
  return (
    <span
      className="flex items-center gap-1 text-[10px] font-semibold rounded-full border px-2 py-0.5"
      style={{ color: meta.color, background: meta.bg, borderColor: meta.border }}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
      {meta.label}
    </span>
  )
}

export default function MyConversationsPanel({ conversations = [], loading = false, error = '', onRetry, onOpen, onNewChat, hasMore = false, onLoadMore }) {
  const [activeFilter, setActiveFilter] = useState('all')

  const filtered = conversations.filter((c) => {
    if (activeFilter === 'active') return c.status === 'WAITING' || c.status === 'IN_PROGRESS'
    if (activeFilter === 'done') return c.status === 'RESOLVED' || c.status === 'CLOSED'
    return true
  })

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-slate-700/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-white">Cuộc trò chuyện của tôi</h2>
          <button className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors">
            <SlidersHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5 p-1 bg-slate-800/60 rounded-xl">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setActiveFilter(f.id)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all duration-150 ${
                activeFilter === f.id
                  ? 'bg-slate-700 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {loading && conversations.length === 0 ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">Đang tải cuộc trò chuyện…</div>
        ) : error ? (
          <div className="flex h-40 flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-red-400">{error}</p>
            <button onClick={onRetry} className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300">Thử lại</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2">
            <MessageSquare className="h-8 w-8 text-slate-600" />
            <p className="text-sm text-slate-500 font-medium">Chưa có cuộc trò chuyện nào</p>
            <p className="text-xs text-slate-600">Bấm "Chat mới" để bắt đầu</p>
          </div>
        ) : (
          <>{filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onOpen?.(conv)}
              className="w-full text-left rounded-xl border border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70 px-3.5 py-3 transition-all duration-150 group"
            >
              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-7 w-7 rounded-lg gradient-brand flex items-center justify-center shrink-0 text-[10px] font-black text-white">
                    C
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-white truncate">{conv.cinemaName}</p>
                    <p className="text-[10px] text-slate-500">{conv.topic}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[10px] text-slate-500">{conv.lastMessageTime}</span>
                  {conv.unread > 0 && (
                    <span className="h-4 w-4 rounded-full gradient-brand text-[9px] font-bold text-white flex items-center justify-center">
                      {conv.unread}
                    </span>
                  )}
                </div>
              </div>

              {/* Last message */}
              <p className="text-[11px] text-slate-400 line-clamp-1 mb-2">
                {conv.lastMessage}
              </p>

              {/* Bottom row */}
              <div className="flex items-center gap-2 flex-wrap">
                <StatusDot status={conv.status} />
                {conv.bookingCode && (
                  <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-full px-2 py-0.5 font-medium">
                    {conv.bookingCode}
                  </span>
                )}
              </div>
            </button>
          ))}{hasMore && <button type="button" disabled={loading} onClick={onLoadMore} className="mx-auto my-3 block rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 disabled:opacity-50">{loading ? 'Đang tải…' : 'Tải thêm'}</button>}</>
        )}
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <button
          onClick={onNewChat}
          className="w-full rounded-xl gradient-brand py-2.5 text-sm font-semibold text-white shadow-sm hover:brightness-110 transition-all active:scale-[0.98]"
        >
          + Chat hỗ trợ mới
        </button>
      </div>
    </div>
  )
}
