import {
  AlertTriangle, ArrowLeft, Calendar, Check, Clock, Copy,
  Film, Loader2, Tag, Ticket, Users, Zap,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import DOMPurify from 'dompurify'
import promotionService, { fmtVND } from '../../services/promotionService'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtDateTime = (iso) =>
  iso
    ? new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : '—'

function isExpiringSoon(endDate) {
  if (!endDate) return false
  const diff = new Date(endDate).getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000
}

function isCurrentlyAvailable(promo) {
  if (!promo || promo.active !== true) return false
  if (!['ACTIVE', 'EXPIRING_SOON'].includes(promo.status)) return false
  const now = new Date()
  if (promo.startDate && new Date(promo.startDate) > now) return false
  if (promo.endDate && new Date(promo.endDate) < now) return false
  return promo.maxUsage == null || (promo.usedCount ?? 0) < promo.maxUsage
}

/* ─── Info Row ────────────────────────────────────────────────────────────── */
function InfoRow({ label, value, highlight }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
    }}>
      <span style={{ fontSize: 13, color: '#64748b', minWidth: 160, flexShrink: 0 }}>{label}</span>
      <span style={{
        fontSize: 13, fontWeight: 700, textAlign: 'right',
        color: highlight ? '#34d399' : '#f1f5f9',
      }}>
        {value}
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   PUBLIC PROMOTION DETAIL PAGE
══════════════════════════════════════════════════════════════════════════════ */
export default function PublicPromotionDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [promo, setPromo]         = useState(null)
  const [loading, setLoading]     = useState(true)
  const [notFound, setNotFound]   = useState(false)
  const [copied, setCopied]       = useState(false)
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setNotFound(false)
    promotionService.getById(id)
      .then((p) => {
        if (cancelled) return
        if (!isCurrentlyAvailable(p)) {
          setNotFound(true)
          return
        }
        setPromo(p)
      })
      .catch(() => {
        if (!cancelled) setNotFound(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [id])

  const handleCopy = async () => {
    if (!promo?.code) return
    try {
      await navigator.clipboard.writeText(promo.code)
      setCopied(true)
      toast.success(`Đã sao chép mã "${promo.code}"!`, { icon: '🎟️' })
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Không thể sao chép. Vui lòng sao chép thủ công.')
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 14,
        background: '#0f172a', color: '#64748b',
      }}>
        <Loader2 size={28} style={{ animation: 'ppd-spin 1s linear infinite' }} />
        <p style={{ margin: 0, fontSize: 14 }}>Đang tải khuyến mãi...</p>
        <style>{`@keyframes ppd-spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    )
  }

  /* ── Not found ── */
  if (notFound || !promo) {
    return (
      <div style={{
        minHeight: '60vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexDirection: 'column', gap: 16,
        background: '#0f172a', color: '#64748b', textAlign: 'center', padding: 32,
      }}>
        <AlertTriangle size={48} color="rgba(239,68,68,0.4)" />
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#94a3b8' }}>
          Không tìm thấy khuyến mãi
        </h2>
        <p style={{ margin: 0, fontSize: 14, maxWidth: 360, lineHeight: 1.6 }}>
          Khuyến mãi này không tồn tại hoặc đã hết hạn.
        </p>
        <Link
          to="/promotions"
          style={{
            marginTop: 8,
            display: 'inline-flex', alignItems: 'center', gap: 7,
            padding: '10px 24px', borderRadius: 10,
            background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            textDecoration: 'none',
          }}
        >
          <ArrowLeft size={15} />
          Xem tất cả khuyến mãi
        </Link>
      </div>
    )
  }

  /* ── Derived values ── */
  const isPercent  = promo.discountType === 'PERCENT' || promo.discountType === 'PERCENTAGE'
  const discountLabel = isPercent
    ? `Giảm ${promo.discountValue}%`
    : `Giảm ${fmtVND(promo.discountValue)}`
  const expiring   = isExpiringSoon(promo.endDate)
  const remaining  = promo.maxUsage != null
    ? Math.max(0, promo.maxUsage - (promo.usedCount ?? 0))
    : null
  const usagePct   = promo.maxUsage
    ? Math.min(100, ((promo.usedCount ?? 0) / promo.maxUsage) * 100)
    : 0

  return (
    <div style={{ minHeight: '100vh', background: '#0f172a', color: '#e2e8f0', paddingBottom: 80 }}>
      {/* ── Back nav ── */}
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 24px 0' }}>
        <button
          onClick={() => navigate('/promotions')}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(71,85,105,0.4)',
            borderRadius: 10, padding: '8px 16px',
            color: '#94a3b8', fontSize: 13, fontWeight: 600,
            cursor: 'pointer', transition: 'background 0.2s, color 0.2s',
          }}
          onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = '#f1f5f9' }}
          onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#94a3b8' }}
          aria-label="Quay lại danh sách khuyến mãi"
        >
          <ArrowLeft size={15} />
          Tất cả khuyến mãi
        </button>
      </div>

      {/* ── Main card ── */}
      <div style={{ maxWidth: 900, margin: '24px auto', padding: '0 24px' }}>
        <div style={{
          background: 'rgba(30,41,59,0.7)',
          border: '1px solid rgba(71,85,105,0.35)',
          borderRadius: 20,
          overflow: 'hidden',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}>
          {/* ── Hero image ── */}
          {promo.imageUrl && !imgFailed ? (
            <div style={{
              position: 'relative', width: '100%', aspectRatio: '21/7',
              minHeight: 180, maxHeight: 380,
              background: '#0f172a', overflow: 'hidden',
            }}>
              <img
                src={promo.imageUrl}
                alt={promo.name}
                onError={() => setImgFailed(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg,rgba(15,23,42,0.8) 0%,transparent 55%,rgba(15,23,42,0.2))',
              }} />
              {/* Overlay text */}
              <div style={{ position: 'absolute', left: 28, bottom: 24, maxWidth: '55%' }}>
                <code style={{ fontSize: 13, letterSpacing: 3, color: '#fca5a5', fontWeight: 800 }}>
                  {promo.code}
                </code>
                <h1 style={{
                  margin: '6px 0 0',
                  fontSize: 'clamp(18px,3vw,28px)',
                  fontWeight: 900, color: '#fff',
                  textShadow: '0 2px 12px rgba(0,0,0,0.6)',
                  lineHeight: 1.25,
                }}>
                  {promo.name}
                </h1>
              </div>
              {/* Badges */}
              <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                <span style={{
                  background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                  color: '#fff', fontSize: 13, fontWeight: 800,
                  padding: '5px 14px', borderRadius: 999,
                  boxShadow: '0 3px 12px rgba(239,68,68,0.45)',
                }}>
                  {discountLabel}
                </span>
                {expiring && (
                  <span style={{
                    background: 'rgba(249,115,22,0.9)', color: '#fff',
                    fontSize: 11, fontWeight: 800,
                    padding: '3px 10px', borderRadius: 999,
                  }}>
                    Sắp hết hạn
                  </span>
                )}
              </div>
            </div>
          ) : (
            /* No image fallback banner */
            <div style={{
              padding: '36px 28px',
              background: 'linear-gradient(135deg,rgba(239,68,68,0.08),rgba(168,85,247,0.06))',
              borderBottom: '1px solid rgba(71,85,105,0.2)',
              display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap',
            }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%',
                background: 'rgba(239,68,68,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                <Tag size={28} color="#ef4444" />
              </div>
              <div>
                <code style={{ fontSize: 13, letterSpacing: 3, color: '#fca5a5', fontWeight: 800 }}>
                  {promo.code}
                </code>
                <h1 style={{ margin: '6px 0 0', fontSize: 24, fontWeight: 900, color: '#f1f5f9' }}>
                  {promo.name}
                </h1>
              </div>
            </div>
          )}

          {/* ── Body ── */}
          <div style={{ padding: 28 }}>
            {/* Discount badge row */}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 24 }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(52,211,153,0.1)',
                border: '1px solid rgba(52,211,153,0.25)',
                color: '#34d399', fontSize: 14, fontWeight: 800,
                padding: '6px 16px', borderRadius: 999,
              }}>
                <Zap size={14} />
                {discountLabel}
                {isPercent && promo.maxDiscount ? ` (tối đa ${fmtVND(promo.maxDiscount)})` : ''}
              </span>
            </div>

            {/* Description */}
            {promo.description && (
              <div
                className="promotion-rich-content"
                style={{
                margin: '0 0 24px',
                fontSize: 14, color: '#94a3b8', lineHeight: 1.7,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(71,85,105,0.2)',
                borderRadius: 12, padding: '14px 18px',
                }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(promo.description) }}
              />
            )}

            {/* Two-column layout */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }} className="ppd-cols">
              {/* Left: Details */}
              <div>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 12, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Thông tin khuyến mãi
                </h2>
                <InfoRow label="Loại giảm giá"   value={isPercent ? 'Phần trăm (%)' : 'Cố định (₫)'} />
                <InfoRow label="Giá trị giảm"    value={isPercent ? `${promo.discountValue}%` : fmtVND(promo.discountValue)} highlight />
                {isPercent && promo.maxDiscount && (
                  <InfoRow label="Giảm tối đa"     value={fmtVND(promo.maxDiscount)} />
                )}
                <InfoRow label="Đơn tối thiểu"   value={promo.minOrderValue > 0 ? fmtVND(promo.minOrderValue) : 'Không giới hạn'} />
                <InfoRow label="Bắt đầu"          value={fmtDateTime(promo.startDate)} />
                <InfoRow label="Kết thúc"         value={promo.endDate ? fmtDateTime(promo.endDate) : 'Không giới hạn'} />
              </div>

              {/* Right: Apply scope */}
              <div>
                <h2 style={{
                  margin: '0 0 16px',
                  fontSize: 12, fontWeight: 700, color: '#475569',
                  textTransform: 'uppercase', letterSpacing: '0.08em',
                }}>
                  Phạm vi áp dụng
                </h2>
                <InfoRow
                  label="Rạp áp dụng"
                  value={
                    promo.applyCinemas === 'ALL'
                      ? 'Tất cả rạp'
                      : `${promo.cinemaIds?.length ?? 0} rạp được chọn`
                  }
                />
                <InfoRow
                  label="Phim áp dụng"
                  value={
                    promo.applyToMovies === 'ALL'
                      ? 'Tất cả phim'
                      : `${promo.movieIds?.length ?? 0} phim được chọn`
                  }
                />
                <InfoRow label="Yêu cầu đăng nhập" value={promo.requireLogin ? 'Có' : 'Không'} />
                {promo.maxUsage != null && (
                  <InfoRow
                    label="Số lượt còn lại"
                    value={remaining != null ? `${Number(remaining).toLocaleString('vi-VN')} lượt` : 'Không giới hạn'}
                  />
                )}
                {promo.maxPerUser && (
                  <InfoRow label="Tối đa / tài khoản" value={`${promo.maxPerUser} lượt`} />
                )}
              </div>
            </div>

            {/* Usage progress bar */}
            {promo.maxUsage > 0 && (
              <div style={{
                marginTop: 24,
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(71,85,105,0.2)',
                borderRadius: 12, padding: '14px 18px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12 }}>
                  <span style={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Users size={12} /> Đã sử dụng
                  </span>
                  <span style={{ color: '#f1f5f9', fontWeight: 700 }}>
                    {Number(promo.usedCount ?? 0).toLocaleString('vi-VN')} / {Number(promo.maxUsage).toLocaleString('vi-VN')} lượt
                  </span>
                </div>
                <div style={{ height: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 4 }}>
                  <div style={{
                    height: '100%', borderRadius: 4,
                    width: `${usagePct}%`,
                    background: usagePct > 90 ? '#ef4444' : usagePct > 70 ? '#f97316' : '#22c55e',
                    transition: 'width 0.6s cubic-bezier(0.22,1,0.36,1)',
                  }} />
                </div>
                <div style={{ marginTop: 6, fontSize: 11, color: '#64748b', textAlign: 'right' }}>
                  Còn {Number(remaining).toLocaleString('vi-VN')} lượt
                </div>
              </div>
            )}

            {/* ── Code + CTA ── */}
            <div style={{ marginTop: 28, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {/* Copy code button */}
              <button
                onClick={handleCopy}
                style={{
                  flex: 1, minWidth: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'rgba(239,68,68,0.07)',
                  border: '2px dashed rgba(239,68,68,0.4)',
                  borderRadius: 12, padding: '14px 20px',
                  cursor: 'pointer',
                  transition: 'background 0.2s, border-color 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.12)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.6)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.07)'; e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)' }}
                aria-label={`Sao chép mã khuyến mãi ${promo.code}`}
              >
                <Tag size={16} color="#ef4444" />
                <code style={{ fontSize: 18, fontWeight: 900, color: '#fca5a5', letterSpacing: '0.1em', flex: 1, textAlign: 'center' }}>
                  {promo.code}
                </code>
                {copied
                  ? <Check size={17} color="#34d399" />
                  : <Copy size={16} color="#ef4444" />
                }
              </button>

              {/* Book now CTA */}
              <Link
                to="/schedule"
                style={{
                  flex: 1, minWidth: 200,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                  background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
                  color: '#fff', fontWeight: 800, fontSize: 15,
                  padding: '14px 24px', borderRadius: 12,
                  textDecoration: 'none',
                  boxShadow: '0 4px 20px rgba(239,68,68,0.35)',
                  transition: 'filter 0.2s, box-shadow 0.2s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.1)'; e.currentTarget.style.boxShadow = '0 6px 28px rgba(239,68,68,0.5)' }}
                onMouseOut={(e) => { e.currentTarget.style.filter = ''; e.currentTarget.style.boxShadow = '0 4px 20px rgba(239,68,68,0.35)' }}
                aria-label="Đặt vé ngay"
              >
                <Ticket size={17} />
                Đặt vé ngay
              </Link>
            </div>

            {/* Copy hint */}
            <p style={{ marginTop: 12, textAlign: 'center', fontSize: 12, color: '#475569' }}>
              Nhấn vào mã để sao chép, sau đó dán vào ô khuyến mãi khi đặt vé.
            </p>
          </div>
        </div>

        {/* More promotions link */}
        <div style={{ textAlign: 'center', marginTop: 32 }}>
          <Link
            to="/promotions"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: '#94a3b8', fontSize: 13, fontWeight: 600,
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = '#f1f5f9')}
            onMouseOut={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <Film size={14} />
            Xem thêm khuyến mãi khác
          </Link>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        .promotion-rich-content > :first-child { margin-top: 0; }
        .promotion-rich-content > :last-child { margin-bottom: 0; }
        .promotion-rich-content h2, .promotion-rich-content h3, .promotion-rich-content h4 { color: #f1f5f9; line-height: 1.35; }
        .promotion-rich-content a { color: #60a5fa; }
        .promotion-rich-content blockquote { margin-left: 0; padding-left: 14px; border-left: 3px solid #ef4444; color: #cbd5e1; }
        .promotion-rich-content ul, .promotion-rich-content ol { padding-left: 22px; }
        @media (max-width: 600px) {
          .ppd-cols { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
