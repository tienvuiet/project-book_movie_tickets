export default function CinemaIllustration() {
  return (
    <div className="auth-cinema-art" aria-hidden="true">
      <svg viewBox="0 0 560 380" fill="none" className="auth-cinema-scene">
        <defs>
          <linearGradient id="auth-curtain" x1="0" y1="0" x2="560" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#2b1118" /><stop offset=".18" stopColor="#602733" /><stop offset=".5" stopColor="#36141f" /><stop offset=".8" stopColor="#642b36" /><stop offset="1" stopColor="#291017" />
          </linearGradient>
          <linearGradient id="auth-fold" x1="0" y1="0" x2="42" y2="0" gradientUnits="userSpaceOnUse">
            <stop stopColor="#210c12" stopOpacity=".65" /><stop offset=".55" stopColor="#9d5460" stopOpacity=".18" /><stop offset="1" stopColor="#210c12" stopOpacity=".55" />
          </linearGradient>
          <linearGradient id="auth-seat" x1="0" y1="0" x2="0" y2="70" gradientUnits="userSpaceOnUse">
            <stop stopColor="#853b45" /><stop offset=".5" stopColor="#5f2631" /><stop offset="1" stopColor="#351820" />
          </linearGradient>
          <linearGradient id="auth-scene-fade" x1="0" y1="230" x2="0" y2="380" gradientUnits="userSpaceOnUse">
            <stop stopColor="#30151d" stopOpacity="0" /><stop offset="1" stopColor="#30151d" />
          </linearGradient>
          <pattern id="auth-curtain-folds" width="42" height="300" patternUnits="userSpaceOnUse"><path fill="url(#auth-fold)" d="M0 0h42v300H0z" /></pattern>
          <g id="auth-cinema-seat">
            <path d="M7 19C7 8 15 2 29 2h7c14 0 22 6 22 17v38H7V19Z" fill="url(#auth-seat)" stroke="#a95e65" strokeOpacity=".3" />
            <path d="M13 21c0-8 5-12 18-12s21 4 21 12v25H13V21Z" stroke="#be7c7d" strokeOpacity=".16" />
            <rect x="3" y="45" width="59" height="16" rx="7" fill="#5a2831" stroke="#b97778" strokeOpacity=".18" />
            <rect y="34" width="9" height="28" rx="4" fill="#30151d" /><rect x="56" y="34" width="9" height="28" rx="4" fill="#30151d" />
          </g>
        </defs>
        <path d="M15 20Q280-12 545 20v290H15V20Z" fill="url(#auth-curtain)" />
        <path d="M15 20Q280-12 545 20v290H15V20Z" fill="url(#auth-curtain-folds)" />
        <path d="M15 20Q280 70 545 20" stroke="#bd8c65" strokeOpacity=".32" />
        <path d="M28 27Q280 76 532 27" stroke="#bd8c65" strokeOpacity=".14" />
        <g opacity=".6" transform="translate(22 253) scale(.85)">
          {Array.from({ length: 8 }, (_, i) => <use key={i} href="#auth-cinema-seat" x={i * 75} />)}
        </g>
        <g transform="translate(-20 307) scale(1.08)">
          {Array.from({ length: 8 }, (_, i) => <use key={i} href="#auth-cinema-seat" x={i * 75} />)}
        </g>
        <path d="M0 230h560v150H0z" fill="url(#auth-scene-fade)" />
      </svg>
      <div className="auth-paper-ticket">
        <div className="auth-ticket-body">
          <div className="auth-ticket-topline"><span>CGV CINEMAS</span><span>EST. 2026</span></div>
          <div className="auth-ticket-title">CINEMA</div>
          <div className="auth-ticket-subtitle">MỘT CHỖ NGỒI. NGÀN CẢM XÚC.</div>
          <div className="auth-ticket-details"><div>SUẤT CHIẾU<strong>HÔM NAY</strong></div><div>HÀNG GHẾ<strong>G / 08</strong></div><div>LOẠI VÉ<strong>ĐIỆN ẢNH</strong></div></div>
        </div>
        <div className="auth-ticket-stub"><span>ADMIT ONE</span><div className="auth-ticket-barcode" /><small>No. 000128</small></div>
      </div>
      <span className="auth-art-caption">YOUR NEXT SCENE STARTS HERE</span>
    </div>
  )
}
