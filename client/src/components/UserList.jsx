import React from 'react'
import Avatar from './Avatar'

function formatDate(d) {
  if (!d) return ''
  try {
    const dt = new Date(d)
    const now = new Date()
    const sameDay = dt.toDateString() === now.toDateString()
    return sameDay ? dt.toLocaleTimeString() : dt.toLocaleDateString()
  } catch { return '' }
}

export default function UserList({ users = [], onSelect, selectedUserId }) {
  return (
    <div className="conv-list">
      {users.length === 0 && <div className="muted" style={{padding: 16}}>Aucun utilisateur</div>}
      {users.map(u => {
        const uid = String(u.id || u._id)
        const isSel = selectedUserId && String(selectedUserId) === uid
        return (
          <div key={uid} className={`conv-item ${isSel ? 'selected' : ''}`} onClick={() => onSelect && onSelect(u)}>
            <Avatar user={u} showStatus />
            <div className="conv-main">
              <div className="conv-title">
                <span>{u.username}</span>
                {u.status === 'online' ? (
                  <span className="badge online">en ligne</span>
                ) : (
                  <span className="badge">{formatDate(u.lastLogin)}</span>
                )}
              </div>
              <div className="conv-sub">
                <span className="ellipsis muted">Utilisateur</span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
