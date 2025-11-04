import React from 'react'
import Avatar from './Avatar'

function formatDate(d) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    const now = new Date()
    const sameDay = dt.toDateString() === now.toDateString()
    return sameDay ? dt.toLocaleTimeString() : dt.toLocaleDateString()
  } catch {
    return ''
  }
}

export default function ConversationList({ items = [], selectedUserId, onSelect }) {
  return (
    <div className="conv-list">
      {items.length === 0 && <div className="muted" style={{padding: 16}}>Aucune conversation</div>}
      {items.map((c) => {
        const other = c.other
        const uid = String(other.id || other._id)
        const isSel = selectedUserId && String(selectedUserId) === uid
        return (
          <div key={uid} className={`conv-item ${isSel ? 'selected' : ''}`} onClick={() => onSelect && onSelect(other)}>
            <Avatar user={other} showStatus />
            <div className="conv-main">
              <div className="conv-title">
                <span>{other.username}</span>
                {other.status === 'online' ? <span className="badge online">en ligne</span> : <span className="badge">{formatDate(other.lastLogin)}</span>}
              </div>
              <div className="conv-sub">
                <span className="ellipsis">{c.lastMessage?.content || ''}</span>
                {c.unreadCount > 0 && <span className="pill">{c.unreadCount}</span>}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
