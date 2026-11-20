import {
  Armchair,
  Calendar,
  ChevronLeft,
  CreditCard,
  MessageCircle,
  Star,
  Ticket,
} from 'lucide-react'
import { useState } from 'react'
import { SUPPORT_TOPICS } from '../../../data/supportMockData'

const ICON_MAP = {
  Ticket: Ticket,
  CreditCard: CreditCard,
  Armchair: Armchair,
  Calendar: Calendar,
  Star: Star,
  MessageCircle: MessageCircle,
}

export default function TopicPickerStep({ cinema, onBack, onConfirm }) {
  const [selected, setSelected] = useState(null)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-5 pt-4 pb-4 border-b border-slate-700/50">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors mb-3"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Quay lại
        </button>

        {/* Cinema context */}
        <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40">
          <div className="h-6 w-6 rounded-lg gradient-brand flex items-center justify-center shrink-0">
            <Star className="h-3 w-3 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-white truncate">{cinema?.name}</p>
            <p className="text-[10px] text-slate-500 truncate">{cinema?.shortAddress}</p>
          </div>
        </div>

        <h2 className="text-base font-bold text-white">Bạn cần hỗ trợ vấn đề gì?</h2>
        <p className="mt-1 text-xs text-slate-400">Chọn chủ đề để nhân viên hỗ trợ nhanh hơn</p>
      </div>

      {/* Topics grid */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="grid grid-cols-2 gap-2.5">
          {SUPPORT_TOPICS.map((topic) => {
            const Icon = ICON_MAP[topic.icon] || MessageCircle
            const isSelected = selected?.id === topic.id
            return (
              <button
                key={topic.id}
                onClick={() => setSelected(topic)}
                className={`flex flex-col items-center gap-2.5 rounded-xl border px-3 py-4 text-center transition-all duration-150 ${
                  isSelected
                    ? 'border-red-500/50 bg-red-500/10 ring-1 ring-red-500/20'
                    : 'border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/70'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors ${
                    isSelected ? 'gradient-brand' : 'bg-slate-700/60'
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 ${isSelected ? 'text-white' : 'text-slate-400'}`}
                  />
                </div>
                <span
                  className={`text-xs font-semibold leading-snug ${
                    isSelected ? 'text-white' : 'text-slate-300'
                  }`}
                >
                  {topic.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <button
          disabled={!selected}
          onClick={() => selected && onConfirm(selected)}
          className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all duration-200
            disabled:opacity-40 disabled:cursor-not-allowed
            enabled:gradient-brand enabled:text-white enabled:shadow-sm enabled:hover:brightness-110 enabled:active:scale-[0.98]"
        >
          {selected ? `Bắt đầu trò chuyện — ${selected.label}` : 'Bắt đầu trò chuyện'}
        </button>
      </div>
    </div>
  )
}
