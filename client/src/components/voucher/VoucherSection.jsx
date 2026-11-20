/**
 * VoucherSection – Component nhập/chọn khuyến mãi tại trang thanh toán.
 *
 * Props:
 *   orderAmount     {number}   – Tổng tiền đơn hàng (để tính discount preview)
 *   bookingId       {string}   – ID booking (dùng khi gọi DELETE /bookings/{id}/promo)
 *   paymentLocked   {boolean}  – True khi booking đã hết hạn
 *   hasPayOsLink    {boolean}  – True khi link PayOS đã được tạo (không cho đổi mã)
 *   initialCode     {string}   – Mã đã áp sẵn từ booking.promoCode
 *   onVoucherChange {(promo|null, discountAmount, updatedBooking|null) => void}
 */
import {
  AlertCircle, AlertTriangle, BadgePercent, Calendar, CheckCircle2,
  ChevronDown, ChevronUp, Edit3, Film, Info, Loader2,
  MapPin, Tag, Ticket, X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import promotionService, { calcDiscountAmount, validatePromotion } from '../../services/promotionService'
import bookingService from '../../services/bookingService'

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const fmt = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 })
const fmtVND  = (n) => fmt.format(n || 0)
const fmtDate = (s) => {
  if (!s) return null
  const d = new Date(s)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/* ─── Scope tags ────────────────────────────────────────────────────────────── */
function ScopeTag({ icon: Icon, label, color }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color, background: `${color}15`, border: `1px solid ${color}30`, borderRadius: 5, padding: '2px 7px', fontWeight: 600 }}>
      <Icon size={9} /> {label}
    </span>
  )
}

/* ─── Single Promo Card ─────────────────────────────────────────────────────── */
function PromoCard({ promo, orderAmount, onSelect, isSelected }) {
  const { ok, reason } = validatePromotion(promo, orderAmount)
  const discount = ok ? calcDiscountAmount(promo, orderAmount) : 0
  const isExpiringSoon = promo.status === 'EXPIRING_SOON'

  return (
    <div
      onClick={() => ok && onSelect(promo)}
      style={{
        border: `1px solid ${isSelected ? 'rgba(225,29,72,.5)' : ok ? isExpiringSoon ? 'rgba(249,115,22,.25)' : 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.04)'}`,
        background: isSelected ? 'rgba(225,29,72,.07)' : ok ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.015)',
        borderRadius: 10, padding: '13px 15px 11px',
        opacity: ok ? 1 : 0.6,
        cursor: ok ? 'pointer' : 'default',
        transition: 'all .15s', position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Left accent */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: ok ? isExpiringSoon ? '#f97316' : '#e11d48' : '#334155', borderRadius: '10px 0 0 10px' }} />

      <div style={{ paddingLeft: 9, display: 'flex', gap: 12, alignItems: 'stretch' }}>
        {promo.imageUrl && (
          <img
            src={promo.imageUrl}
            alt={promo.name || `Khuyến mãi ${promo.code}`}
            onError={(event) => { event.currentTarget.style.display = 'none' }}
            style={{ width: 92, minHeight: 82, borderRadius: 8, objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,.08)' }}
          />
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
        {/* Top row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 5 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <span style={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 13, color: ok ? '#f87171' : '#64748b', letterSpacing: 1 }}>
                {promo.code}
              </span>
              {isSelected && <CheckCircle2 size={13} color="#22c55e" />}
              {isExpiringSoon && !isSelected && (
                <span style={{ fontSize: 10, color: '#f97316', background: 'rgba(249,115,22,.15)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>Sắp HSD</span>
              )}
            </div>
            <p style={{ fontSize: 12, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{promo.name}</p>
          </div>
          {ok && discount > 0 && (
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: '#34d399' }}>-{fmtVND(discount)}</div>
              <div style={{ fontSize: 10, color: '#64748b' }}>tiết kiệm</div>
            </div>
          )}
        </div>

        {/* Conditions row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '3px 8px', fontSize: 11, color: '#64748b', marginBottom: ok && !reason ? 6 : 3 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <BadgePercent size={9} />
            {promo.discountType === 'PERCENT'
              ? `Giảm ${promo.discountValue}%${promo.maxDiscount ? ` ≤${fmtVND(promo.maxDiscount)}` : ''}`
              : `Giảm ${fmtVND(promo.discountValue)}`}
          </span>
          {promo.minOrderValue > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <Info size={9} />Đơn từ {fmtVND(promo.minOrderValue)}
            </span>
          )}
          {promo.endDate && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: isExpiringSoon ? '#f97316' : '#64748b' }}>
              <Calendar size={9} />HSD: {fmtDate(promo.endDate)}
            </span>
          )}
          {promo.maxPerUser > 0 && (
            <span>Tối đa {promo.maxPerUser}×/người</span>
          )}
        </div>

        {/* Scope tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
          {promo.applyToMovies === 'SELECTED' && promo.movieIds?.length > 0 && (
            <ScopeTag icon={Film} label={`${promo.movieIds.length} phim`} color="#7c3aed" />
          )}
          {promo.applyCinemas === 'SELECTED' && promo.cinemaIds?.length > 0 && (
            <ScopeTag icon={MapPin} label={`${promo.cinemaIds.length} rạp`} color="#0ea5e9" />
          )}
        </div>

        {/* Error reason */}
        {!ok && reason && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'rgba(239,68,68,.08)', borderRadius: 6, padding: '4px 8px', marginBottom: 4 }}>
            <AlertCircle size={10} color="#ef4444" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: '#ef4444' }}>{reason}</span>
          </div>
        )}

        {/* Select button */}
        {ok && (
          <div>
            <button
              onClick={(e) => { e.stopPropagation(); onSelect(isSelected ? null : promo) }}
              style={{
                background: isSelected ? '#166534' : 'rgba(225,29,72,.15)',
                border: `1px solid ${isSelected ? 'rgba(22,163,74,.4)' : 'rgba(225,29,72,.3)'}`,
                borderRadius: 6, color: isSelected ? '#4ade80' : '#f87171',
                fontSize: 11, fontWeight: 700, padding: '4px 13px', cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {isSelected ? '✓ Đang dùng' : 'Áp dụng'}
            </button>
          </div>
        )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   VoucherSection
══════════════════════════════════════════════════════════════════════════════ */
export default function VoucherSection({
  orderAmount = 0,
  bookingId,
  paymentLocked = false,
  hasPayOsLink  = false,
  initialCode   = '',
  onVoucherChange,
}) {
  const [inputCode, setInputCode]       = useState('')
  const [applied, setApplied]           = useState(null)   // promo object
  const [applying, setApplying]         = useState(false)
  const [removing, setRemoving]         = useState(false)
  const [error, setError]               = useState('')
  const [showList, setShowList]         = useState(false)
  const [editing, setEditing]           = useState(false)
  const [promos, setPromos]             = useState([])
  const [loadingList, setLoadingList]   = useState(false)
  const initDone = useRef(false)

  // Load danh sách khuyến mãi khả dụng
  useEffect(() => {
    setLoadingList(true)
    promotionService.getAvailable({ orderAmount: orderAmount || undefined })
      .then(setPromos)
      .catch(() => setPromos([]))
      .finally(() => setLoadingList(false))
  }, [orderAmount])

  // Khởi tạo applied voucher từ initialCode (booking.promoCode)
  useEffect(() => {
    if (!initialCode || initDone.current) return
    initDone.current = true
    const found = promos.find((p) => p.code === initialCode.toUpperCase())
    if (found) {
      const { ok, discount } = validatePromotion(found, orderAmount)
      if (ok) {
        setApplied(found)
        setInputCode(found.code)
        const d = discount ?? calcDiscountAmount(found, orderAmount)
        onVoucherChange?.(found, d)
      }
    } else if (initialCode) {
      // Mã có trong booking nhưng không trong list → hiện stub
      const stub = { code: initialCode, name: 'Mã đã áp dụng', status: 'ACTIVE', active: true, minOrderValue: 0, discountType: 'FIXED', discountValue: 0, usedCount: 0, maxUsage: 9999 }
      setApplied(stub)
      setInputCode(initialCode)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode, promos])

  const currentDiscount = applied ? calcDiscountAmount(applied, orderAmount) : 0
  const eligibleCount   = promos.filter((p) => validatePromotion(p, orderAmount).ok).length

  const commitPromo = (p, discount, updatedBooking = null) => {
    setApplied(p)
    setInputCode(p.code)
    setError('')
    setEditing(false)
    setShowList(false)
    onVoucherChange?.(p, discount, updatedBooking)
  }

  const clearApplied = (updatedBooking = null) => {
    setApplied(null)
    setInputCode('')
    setError('')
    setEditing(false)
    onVoucherChange?.(null, 0, updatedBooking)
  }

  const persistPromo = async (promo, previewDiscount) => {
    if (!bookingId) {
      commitPromo(promo, previewDiscount ?? calcDiscountAmount(promo, orderAmount))
      return
    }
    const response = await bookingService.applyPromo(bookingId, promo.code)
    const updatedBooking = response?.data ?? response
    const actualDiscount = Number(updatedBooking?.discountAmount
      ?? previewDiscount
      ?? calcDiscountAmount(promo, orderAmount))
    commitPromo(promo, actualDiscount, updatedBooking)
  }

  const applySelectedPromo = async (promo) => {
    setApplying(true)
    setError('')
    try {
      await persistPromo(promo, calcDiscountAmount(promo, orderAmount))
    } catch (err) {
      setError(err.message || 'Không thể áp dụng mã khuyến mãi.')
    } finally {
      setApplying(false)
    }
  }

  /* ── Áp dụng mã bằng nhập tay ── */
  const applyByCode = async () => {
    const code = inputCode.trim()
    if (!code) return
    setApplying(true)
    setError('')
    try {
      const { promo, discount } = await promotionService.validateCode(code, orderAmount)
      await persistPromo(promo, discount)
    } catch (err) {
      setError(err.message)
    } finally {
      setApplying(false)
    }
  }

  /* ── Bỏ mã – gọi API DELETE ── */
  const removeCode = async () => {
    if (!bookingId) { clearApplied(); return }
    setRemoving(true)
    try {
      const response = await bookingService.removePromo(bookingId)
      const updatedBooking = response?.data ?? response
      clearApplied(updatedBooking)
    } catch (err) {
      setError(err.message || 'Không thể bỏ mã khuyến mãi.')
    } finally {
      setRemoving(false)
    }
  }

  const isLocked = paymentLocked || hasPayOsLink

  return (
    <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,.06)', borderRadius: 16, overflow: 'hidden' }}>
      <style>{`
        .vs-in:focus { border-color:rgba(225,29,72,.5)!important;box-shadow:0 0 0 3px rgba(225,29,72,.12)!important;outline:none; }
        @keyframes vs-spin { to { transform:rotate(360deg); } }
        @keyframes vs-slide { from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)} }
        .vs-apply:hover:not(:disabled){filter:brightness(1.1)}
      `}</style>

      {/* Header */}
      <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 9 }}>
        <Tag size={15} color="#fbbf24" />
        <div style={{ flex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#f1f5f9' }}>Ưu đãi &amp; Khuyến mãi</span>
          {!applied && eligibleCount > 0 && !isLocked && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,.12)', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
              {eligibleCount} mã phù hợp
            </span>
          )}
          {applied && (
            <span style={{ marginLeft: 8, fontSize: 11, color: '#22c55e', background: 'rgba(34,197,94,.12)', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>
              Đã áp dụng
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '15px 18px' }}>

        {/* ── PayOS lock warning ── */}
        {hasPayOsLink && !paymentLocked && (
          <div style={{ display: 'flex', gap: 9, background: 'rgba(234,179,8,.08)', border: '1px solid rgba(234,179,8,.25)', borderRadius: 9, padding: '10px 14px', marginBottom: 12 }}>
            <AlertTriangle size={15} color="#eab308" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <p style={{ fontWeight: 700, color: '#fbbf24', fontSize: 12 }}>Link thanh toán đã được tạo</p>
              <p style={{ color: '#92400e', fontSize: 11, marginTop: 1 }}>Không thể thay đổi mã khuyến mãi sau khi link PayOS đã tạo. Vui lòng chờ link hết hạn.</p>
            </div>
          </div>
        )}

        {/* ── Applied badge ── */}
        {applied && !editing && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.25)', borderRadius: 10, padding: '11px 14px', marginBottom: 12 }}>
            <CheckCircle2 size={17} color="#22c55e" style={{ flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#f1f5f9' }}>
                Đã áp dụng: <span style={{ fontFamily: 'monospace', color: '#f87171', letterSpacing: 1 }}>{applied.code}</span>
              </div>
              {currentDiscount > 0 && (
                <div style={{ fontSize: 12, color: '#4ade80', marginTop: 2 }}>
                  Bạn tiết kiệm <strong>{fmtVND(currentDiscount)}</strong>
                </div>
              )}
            </div>
            {!isLocked && (
              <>
                <button
                  onClick={() => { setEditing(true); setInputCode(''); setError('') }}
                  title="Đổi mã"
                  style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 6, cursor: 'pointer', color: '#94a3b8', padding: '5px 8px', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600 }}
                >
                  <Edit3 size={11} /> Đổi
                </button>
                <button
                  onClick={removeCode}
                  disabled={removing}
                  title="Bỏ mã"
                  style={{ background: 'none', border: 'none', cursor: removing ? 'wait' : 'pointer', color: '#64748b', padding: 4, borderRadius: 4, display: 'flex', alignItems: 'center' }}
                >
                  {removing ? <Loader2 size={14} style={{ animation: 'vs-spin 1s linear infinite' }} /> : <X size={14} />}
                </button>
              </>
            )}
          </div>
        )}

        {/* ── Input mã ── */}
        {(!applied || editing) && !isLocked && (
          <div style={{ marginBottom: 12 }}>
            {editing && (
              <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 7, display: 'flex', alignItems: 'center', gap: 5 }}>
                <Edit3 size={11} color="#fbbf24" />
                Nhập mã mới thay cho <span style={{ fontFamily: 'monospace', color: '#f87171' }}>{applied?.code}</span>
                <button onClick={() => setEditing(false)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', display: 'flex' }}>
                  <X size={12} />
                </button>
              </div>
            )}
            <div style={{ display: 'flex', gap: 7 }}>
              <input
                className="vs-in"
                value={inputCode}
                onChange={(e) => { setInputCode(e.target.value.toUpperCase()); setError('') }}
                onKeyDown={(e) => e.key === 'Enter' && applyByCode()}
                placeholder="Nhập mã khuyến mãi..."
                disabled={applying}
                style={{
                  flex: 1, background: '#0f172a', color: '#f1f5f9',
                  border: `1px solid ${error ? 'rgba(239,68,68,.5)' : 'rgba(255,255,255,.1)'}`,
                  borderRadius: 8, padding: '9px 13px', fontSize: 13, outline: 'none',
                }}
              />
              <button
                className="vs-apply"
                onClick={applyByCode}
                disabled={applying || !inputCode.trim()}
                style={{
                  background: 'linear-gradient(135deg,#e11d48,#be123c)',
                  color: '#fff', border: 'none', borderRadius: 8,
                  padding: '0 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                  opacity: (applying || !inputCode.trim()) ? 0.6 : 1,
                  display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap', transition: 'all .15s',
                }}
              >
                {applying && <Loader2 size={12} style={{ animation: 'vs-spin 1s linear infinite' }} />}
                {applying ? 'Kiểm tra...' : 'Áp dụng'}
              </button>
            </div>

            {/* Error */}
            {error && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 6, padding: '7px 10px', marginTop: 7 }}>
                <AlertCircle size={12} color="#ef4444" style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 11, color: '#ef4444' }}>{error}</span>
              </div>
            )}
          </div>
        )}

        {/* ── Payment locked ── */}
        {isLocked && !hasPayOsLink && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)', borderRadius: 8, padding: '8px 12px', marginBottom: 12 }}>
            <AlertCircle size={12} color="#ef4444" />
            <span style={{ fontSize: 11, color: '#ef4444' }}>Không thể thay đổi voucher khi đơn đã hết hạn.</span>
          </div>
        )}

        {/* ── Toggle danh sách ── */}
        {!isLocked && (
          <button
            onClick={() => setShowList((s) => !s)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)',
              borderRadius: 8, padding: '8px', cursor: 'pointer', color: '#94a3b8', fontSize: 12, fontWeight: 600,
              transition: 'all .15s',
            }}
          >
            <Ticket size={12} />
            {showList ? 'Ẩn danh sách' : 'Chọn từ mã khuyến mãi khả dụng'}
            {showList ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
        )}

        {/* ── Promo list ── */}
        {showList && !isLocked && (
          <div style={{ marginTop: 11, animation: 'vs-slide .2s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em' }}>Mã khuyến mãi</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>
                {loadingList ? 'Đang tải...' : `${eligibleCount}/${promos.length} phù hợp`}
              </span>
            </div>
            {loadingList ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '20px 0', gap: 8, color: '#64748b', fontSize: 13 }}>
                <Loader2 size={16} style={{ animation: 'vs-spin 1s linear infinite' }} /> Đang tải mã khuyến mãi...
              </div>
            ) : promos.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#475569', fontSize: 12, padding: '18px 0' }}>
                Hiện không có mã khuyến mãi nào khả dụng.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {promos.map((p) => (
                  <PromoCard
                    key={p.id ?? p.code}
                    promo={p}
                    orderAmount={orderAmount}
                    isSelected={applied?.code === p.code}
                    onSelect={(selected) => {
                      if (selected === null) { removeCode(); return }
                      applySelectedPromo(selected)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Note */}
        <p style={{ marginTop: 11, fontSize: 10, color: '#334155', display: 'flex', alignItems: 'flex-start', gap: 4 }}>
          <span style={{ flexShrink: 0, marginTop: 1 }}>ⓘ</span>
          Mỗi đơn hàng chỉ áp dụng được 1 mã. Giảm giá thực tế do hệ thống xác nhận khi thanh toán.
        </p>
      </div>
    </div>
  )
}
