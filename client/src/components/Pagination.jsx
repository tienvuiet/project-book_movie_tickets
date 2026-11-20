import { ChevronLeft, ChevronRight } from 'lucide-react'
import Button from './Button'

export default function Pagination({ page = 0, totalPages = 1, onChange }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-dark-700/40 px-4 py-3 text-sm text-dark-400">
      <span>
        Trang <span className="font-semibold text-dark-200">{page + 1}</span> / {Math.max(totalPages, 1)}
      </span>
      <div className="flex gap-1.5">
        <Button
          variant="ghost"
          className="h-8 w-8 !min-h-0 !p-0 rounded-lg"
          disabled={page <= 0}
          onClick={() => onChange?.(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          className="h-8 w-8 !min-h-0 !p-0 rounded-lg"
          disabled={page + 1 >= totalPages}
          onClick={() => onChange?.(page + 1)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
