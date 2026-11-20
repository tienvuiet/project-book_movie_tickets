import { Calendar, Clock, Copy, Tag, Ticket, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { fmtVND } from '../services/promotionService'

/* ─── Helpers ─────────────────────────────────────────────────────────────── */
const fmtDate = (iso) =>
  iso
    ? new Date(iso).toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        timeZone: 'Asia/Ho_Chi_Minh',
      })
    : null

function isExpiringSoon(endDate) {
  if (!endDate) return false
  const diff = new Date(endDate).getTime() - Date.now()
  return diff > 0 && diff <= 3 * 24 * 60 * 60 * 1000 // ≤ 3 ngày
}

function descriptionText(html) {
  if (!html) return ''
  const document = new DOMParser().parseFromString(html, 'text/html')
  return document.body.textContent?.replace(/\s+/g, ' ').trim() || ''
}

/* ─── Skeleton ────────────────────────────────────────────────────────────── */
export function PromotionCardSkeleton() {
  return (
    <div
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(30,41,59,0.6)',
        border: '1px solid rgba(71,85,105,0.3)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
      }}
    >
      {/* image */}
      <div
        style={{
          width: '100%',
          aspectRatio: '16/9',
          background: 'linear-gradient(90deg,#1e293b 25%,#263148 50%,#1e293b 75%)',
          backgroundSize: '200% 100%',
          animation: 'promo-shimmer 1.4s infinite',
        }}
      />
      <div style={{ padding: '16px 18px' }}>
        {[80, 55, 90, 65].map((w, i) => (
          <div
            key={i}
            style={{
              height: 12,
              borderRadius: 6,
              marginBottom: 10,
              width: `${w}%`,
              background: 'linear-gradient(90deg,#1e293b 25%,#263148 50%,#1e293b 75%)',
              backgroundSize: '200% 100%',
              animation: 'promo-shimmer 1.4s infinite',
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
      <style>{`
        @keyframes promo-shimmer {
          0%   { background-position: 200% 0 }
          100% { background-position: -200% 0 }
        }
      `}</style>
    </div>
  )
}

/* ─── Card ────────────────────────────────────────────────────────────────── */
export default function PromotionCard({ promo }) {
  const expiring = isExpiringSoon(promo.endDate)
  const isPercent = promo.discountType === 'PERCENT' || promo.discountType === 'PERCENTAGE'
  const discountLabel = isPercent
    ? `Giảm ${promo.discountValue}%`
    : `Giảm ${fmtVND(promo.discountValue)}`

  return (
    <article
      style={{
        borderRadius: 16,
        overflow: 'hidden',
        background: 'rgba(30,41,59,0.6)',
        border: '1px solid rgba(71,85,105,0.3)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.25s cubic-bezier(0.22,1,0.36,1), box-shadow 0.25s, border-color 0.25s',
        cursor: 'default',
        height: '100%',
      }}
      className="promo-card"
    >
      {/* ── Image ── */}
      <div style={{ position: 'relative', width: '100%', aspectRatio: '16/9', overflow: 'hidden', background: '#0f172a', flexShrink: 0 }}>
        {promo.imageUrl ? (
          <img
            src={promo.imageUrl}
            alt={promo.name}
            loading="lazy"
            style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.4s cubic-bezier(0.22,1,0.36,1)', display: 'block' }}
            className="promo-card-img"
            onError={(e) => { e.currentTarget.style.display = 'none' }}
          />
        ) : (
          <div style={{
            width: '100%', height: '100%',
            background: 'linear-gradient(135deg,#1e293b,#0f172a)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Tag size={40} color="rgba(239,68,68,0.3)" />
          </div>
        )}

        {/* Gradient overlay */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(15,23,42,0.75) 0%, transparent 60%)' }} />

        {/* Expiring badge */}
        {expiring && (
          <div style={{
            position: 'absolute', top: 10, left: 10,
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(249,115,22,0.92)', color: '#fff',
            fontSize: 11, fontWeight: 800,
            padding: '4px 10px', borderRadius: 999,
            boxShadow: '0 2px 8px rgba(249,115,22,0.5)',
            animation: 'promo-pulse 2s ease-in-out infinite',
          }}>
            <AlertTriangle size={11} />
            Sắp hết hạn
          </div>
        )}

        {/* Discount badge */}
        <div style={{
          position: 'absolute', top: 10, right: 10,
          background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
          color: '#fff', fontSize: 12, fontWeight: 800,
          padding: '4px 12px', borderRadius: 999,
          boxShadow: '0 2px 12px rgba(239,68,68,0.45)',
        }}>
          {discountLabel}
        </div>

        {/* End date on image bottom */}
        {promo.endDate && (
          <div style={{
            position: 'absolute', bottom: 10, left: 12,
            display: 'flex', alignItems: 'center', gap: 5,
            color: 'rgba(255,255,255,0.8)', fontSize: 11,
          }}>
            <Clock size={11} />
            <span>Hết hạn: {fmtDate(promo.endDate)}</span>
          </div>
        )}
      </div>

      {/* ── Body ── */}
      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
        {/* Start date */}
        {promo.startDate && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748b', fontSize: 11 }}>
            <Calendar size={12} />
            <span>Từ {fmtDate(promo.startDate)}</span>
          </div>
        )}

        {/* Name */}
        <h3
          style={{
            margin: 0,
            fontSize: 15,
            fontWeight: 700,
            color: '#f1f5f9',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {promo.name || '—'}
        </h3>

        {/* Description */}
        {promo.description && (
          <p
            style={{
              margin: 0,
              fontSize: 12,
              color: '#94a3b8',
              lineHeight: 1.55,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {descriptionText(promo.description)}
          </p>
        )}

        {/* Promo code */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'rgba(239,68,68,0.07)',
          border: '1px dashed rgba(239,68,68,0.3)',
          borderRadius: 8, padding: '7px 12px',
        }}>
          <Tag size={13} color="#ef4444" />
          <code style={{ fontSize: 13, fontWeight: 800, color: '#fca5a5', letterSpacing: '0.08em', flex: 1 }}>
            {promo.code}
          </code>
          <Copy size={12} color="#64748b" />
        </div>

        {/* Discount value & min order */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 700,
            color: '#34d399',
            background: 'rgba(52,211,153,0.1)',
            border: '1px solid rgba(52,211,153,0.2)',
            borderRadius: 6, padding: '3px 8px',
          }}>
            {discountLabel}
            {isPercent && promo.maxDiscount ? ` (tối đa ${fmtVND(promo.maxDiscount)})` : ''}
          </span>
          {promo.minOrderValue > 0 && (
            <span style={{
              fontSize: 11, fontWeight: 600,
              color: '#94a3b8',
              background: 'rgba(148,163,184,0.08)',
              border: '1px solid rgba(148,163,184,0.15)',
              borderRadius: 6, padding: '3px 8px',
            }}>
              Đơn tối thiểu {fmtVND(promo.minOrderValue)}
            </span>
          )}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* CTA */}
        <Link
          to={`/promotions/${promo.id}`}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
            background: 'linear-gradient(135deg,#ef4444,#b91c1c)',
            color: '#fff', fontWeight: 700, fontSize: 13,
            padding: '10px', borderRadius: 10,
            textDecoration: 'none',
            boxShadow: '0 4px 14px rgba(239,68,68,0.3)',
            transition: 'filter 0.2s, box-shadow 0.2s',
          }}
          className="promo-cta"
          aria-label={`Xem chi tiết khuyến mãi ${promo.name}`}
        >
          <Ticket size={14} />
          Xem chi tiết
        </Link>
      </div>

      <style>{`
        .promo-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 48px rgba(0,0,0,0.4), 0 0 0 1px rgba(239,68,68,0.2);
          border-color: rgba(239,68,68,0.25) !important;
        }
        .promo-card:hover .promo-card-img {
          transform: scale(1.06);
        }
        .promo-cta:hover {
          filter: brightness(1.12);
          box-shadow: 0 6px 20px rgba(239,68,68,0.45) !important;
        }
        @keyframes promo-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.75; }
        }
      `}</style>
    </article>
  )
}
