import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, Tag } from 'lucide-react'
import promotionService from '../../services/promotionService'
import PromotionCard, { PromotionCardSkeleton } from '../../components/PromotionCard'

const PAGE_SIZE = 8

/* ─── Empty state ─────────────────────────────────────────────────────────── */
function EmptyState() {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        color: '#475569',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Tag size={36} color="rgba(239,68,68,0.35)" />
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#64748b' }}>
        Hiện chưa có khuyến mãi
      </h3>
      <p style={{ margin: 0, fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
        Chúng tôi đang chuẩn bị các ưu đãi hấp dẫn. Hãy quay lại sau nhé!
      </p>
    </div>
  )
}

/* ─── Error state ─────────────────────────────────────────────────────────── */
function ErrorState({ onRetry }) {
  return (
    <div
      style={{
        gridColumn: '1 / -1',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
        color: '#475569',
        textAlign: 'center',
        gap: 16,
      }}
    >
      <div
        style={{
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'rgba(239,68,68,0.09)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <AlertTriangle size={36} color="rgba(239,68,68,0.5)" />
      </div>
      <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#64748b' }}>
        Không thể tải khuyến mãi
      </h3>
      <p style={{ margin: 0, fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
        Đã xảy ra lỗi khi kết nối đến máy chủ. Vui lòng thử lại.
      </p>
      <button
        onClick={onRetry}
        style={{
          marginTop: 8,
          padding: '10px 28px',
          borderRadius: 10,
          background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 14,
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(239,68,68,0.35)',
          transition: 'filter 0.2s',
        }}
        onMouseOver={(e) => (e.currentTarget.style.filter = 'brightness(1.1)')}
        onMouseOut={(e) => (e.currentTarget.style.filter = '')}
      >
        Thử lại
      </button>
    </div>
  )
}

/* ─── Pagination Controls ─────────────────────────────────────────────────── */
function PaginationBar({ page, totalPages, onChange }) {
  const btnBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 20px',
    borderRadius: 10,
    fontWeight: 700,
    fontSize: 13,
    border: '1px solid rgba(71,85,105,0.4)',
    background: 'rgba(30,41,59,0.6)',
    color: '#cbd5e1',
    cursor: 'pointer',
    transition: 'background 0.2s, color 0.2s, border-color 0.2s, opacity 0.2s',
  }
  const disabled = { opacity: 0.35, cursor: 'not-allowed', pointerEvents: 'none' }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        marginTop: 48,
      }}
    >
      <button
        style={{ ...btnBase, ...(page <= 0 ? disabled : {}) }}
        disabled={page <= 0}
        onClick={() => onChange(page - 1)}
        aria-label="Trang trước"
      >
        <ChevronLeft size={16} />
        Quay lại
      </button>

      <span
        style={{
          fontSize: 14,
          color: '#94a3b8',
          fontWeight: 600,
          minWidth: 80,
          textAlign: 'center',
        }}
      >
        <span style={{ color: '#f1f5f9', fontWeight: 800 }}>{page + 1}</span>
        {' / '}
        {Math.max(totalPages, 1)}
      </span>

      <button
        style={{ ...btnBase, ...(page + 1 >= totalPages ? disabled : {}) }}
        disabled={page + 1 >= totalPages}
        onClick={() => onChange(page + 1)}
        aria-label="Trang tiếp"
      >
        Tiếp theo
        <ChevronRight size={16} />
      </button>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PromotionsPage() {
  const [allPromos, setAllPromos] = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(false)
  const [page, setPage]           = useState(0)
  const topRef = useRef(null)

  const load = async () => {
    setLoading(true)
    setError(false)
    try {
      // promotionService.getAvailable returns normalizePromo[]
      const list = await promotionService.getAvailable()
      // Filter: only ACTIVE/EXPIRING_SOON and not past endDate and not exhausted
      const now = new Date()
      const valid = list.filter((p) => {
        if (p.active !== true) return false
        if (!['ACTIVE', 'EXPIRING_SOON'].includes(p.status)) return false
        if (p.startDate && new Date(p.startDate) > now) return false
        if (p.endDate && new Date(p.endDate) < now) return false
        const used   = p.usedCount ?? 0
        const maxUse = p.maxUsage  ?? null
        if (maxUse !== null && used >= maxUse) return false
        return true
      })
      setAllPromos(valid)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const totalPages = Math.ceil(allPromos.length / PAGE_SIZE) || 1
  const pageItems  = allPromos.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const handlePageChange = (next) => {
    setPage(next)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#0f172a',
        color: '#e2e8f0',
        paddingBottom: 80,
      }}
    >
      {/* ── Content ── */}
      <div
        ref={topRef}
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '48px 24px 0',
        }}
      >
        {/* Subtitle */}
        {!loading && !error && allPromos.length > 0 && (
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#64748b' }}>
              Đang hiển thị{' '}
              <span style={{ color: '#f1f5f9', fontWeight: 700 }}>{allPromos.length}</span>{' '}
              khuyến mãi đang hoạt động
            </p>
          </div>
        )}

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 24,
          }}
          className="promo-grid"
        >
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => <PromotionCardSkeleton key={i} />)
          ) : error ? (
            <ErrorState onRetry={load} />
          ) : pageItems.length === 0 ? (
            <EmptyState />
          ) : (
            pageItems.map((promo) => <PromotionCard key={promo.id} promo={promo} />)
          )}
        </div>

        {/* Pagination */}
        {!loading && !error && allPromos.length > PAGE_SIZE && (
          <PaginationBar
            page={page}
            totalPages={totalPages}
            onChange={handlePageChange}
          />
        )}
      </div>

      {/* Responsive grid */}
      <style>{`
        @media (max-width: 1100px) {
          .promo-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .promo-grid { grid-template-columns: repeat(2, 1fr) !important; gap: 16px !important; }
        }
        @media (max-width: 480px) {
          .promo-grid { grid-template-columns: 1fr !important; gap: 14px !important; }
        }
      `}</style>
    </div>
  )
}
