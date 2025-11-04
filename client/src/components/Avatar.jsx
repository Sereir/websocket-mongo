import React from 'react'

function isUrl(v) {
  if (!v || typeof v !== 'string') return false
  const s = v.trim()
  return /^https?:\/\//i.test(s) || /^data:image\//i.test(s)
}

export default function Avatar({ user, size = 36, className = '', showStatus = true }) {
  const src = user?.avatar
  const radius = 999
  const wrapStyle = { width: size, height: size, borderRadius: radius, overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#111827', border: '1px solid #1f2937', position:'relative' }

  if (isUrl(src)) {
    return (
      <div className={`avatar ${className}`} style={wrapStyle} title={user?.username || user?.email}>
        <img src={src} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        {showStatus && user?.status === 'online' && <span className="status-dot" />}
      </div>
    )
  }
  // Par défaut: avatar vide (cercle)
  return (
    <div className={`avatar ${className}`} style={wrapStyle} title={user?.username || user?.email}>
      {showStatus && user?.status === 'online' && <span className="status-dot" />}
    </div>
  )
}
