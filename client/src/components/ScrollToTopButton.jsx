import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export default function ScrollToTopButton({ hidden = false }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <style>{`
        .scroll-to-top {
          position: fixed;
          bottom: 28px;
          left: 28px;
          z-index: 999;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: #fff;
          box-shadow: 0 4px 20px rgba(239, 68, 68, 0.45);
          transition: opacity 0.3s ease, transform 0.3s ease, box-shadow 0.2s ease;
          outline: none;
        }
        .scroll-to-top.hidden-btn {
          opacity: 0;
          transform: translateY(16px) scale(0.85);
          pointer-events: none;
        }
        .scroll-to-top.chat-hidden {
          opacity: 0 !important;
          transform: translateY(16px) scale(0.85) !important;
          pointer-events: none !important;
        }
        @media (min-width: 640px) {
          .scroll-to-top.chat-hidden {
            opacity: inherit;
            transform: inherit;
            pointer-events: inherit;
          }
        }
        .scroll-to-top.visible-btn {
          opacity: 1;
          transform: translateY(0) scale(1);
          pointer-events: auto;
        }
        .scroll-to-top:hover {
          box-shadow: 0 6px 28px rgba(239, 68, 68, 0.65);
          transform: translateY(-2px) scale(1.08);
        }
        .scroll-to-top:active {
          transform: scale(0.93);
        }

        /* Ripple ring */
        .scroll-to-top::before {
          content: '';
          position: absolute;
          inset: -4px;
          border-radius: 50%;
          border: 2px solid rgba(239, 68, 68, 0.35);
          animation: sttPulse 2s ease-in-out infinite;
        }
        @keyframes sttPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50%       { opacity: 0;   transform: scale(1.35); }
        }

        /* Tooltip */
        .scroll-to-top::after {
          content: 'Lên đầu trang';
          position: absolute;
          left: calc(100% + 10px);
          top: 50%;
          transform: translateY(-50%);
          background: rgba(15, 23, 42, 0.9);
          color: #e2e8f0;
          font-size: 12px;
          font-weight: 600;
          white-space: nowrap;
          padding: 5px 10px;
          border-radius: 8px;
          border: 1px solid rgba(71, 85, 105, 0.4);
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.2s ease;
        }
        .scroll-to-top:hover::after {
          opacity: 1;
        }
      `}</style>

      <button
        onClick={scrollToTop}
        className={`scroll-to-top ${visible ? 'visible-btn' : 'hidden-btn'}${hidden ? ' chat-hidden' : ''}`}
        aria-label="Lên đầu trang"
        title="Lên đầu trang"
      >
        <ArrowUp size={20} strokeWidth={2.5} />
      </button>
    </>
  )
}
