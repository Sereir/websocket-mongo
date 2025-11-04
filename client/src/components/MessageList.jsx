import React, { useEffect, useRef } from 'react'
import Avatar from './Avatar'

function fmtTime(ts) {
  try { return new Date(ts).toLocaleTimeString() } catch { return '' }
}

export default function MessageList({ messages = [], meId, me, other, typing, onEdit, onDelete }) {
  const ref = useRef(null)
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [messages.length, typing])

  const uid = String(meId)

  return (
    <div className="messages" ref={ref}>
      {messages.map((m) => {
        const mine = String(m.sender) === uid
        return (
          <div key={m._id} className={`message-row ${mine ? 'me' : 'other'}`}>
            {!mine && <Avatar user={other} size={28} className="mr" />}
            <div className={`bubble ${mine ? 'me' : 'other'}`}>
              <div className="content">{m.content}</div>
              <div className="meta">
                <span>{fmtTime(m.createdAt)}</span>
                {mine && <span className={`status ${m.status}`}>{m.status === 'read' ? 'Lu' : m.status}</span>}
              </div>
              {mine && (
                <div className="bubble-actions">
                  <button className="link" onClick={()=>onEdit && onEdit(m)}>✎</button>
                  <button className="link" onClick={()=>onDelete && onDelete(m)}>🗑</button>
                </div>
              )}
            </div>
            {mine && <Avatar user={me} size={28} className="ml" />}
          </div>
        )
      })}
      {typing && (
        <div className="typing">{other?.username} est en train d'écrire...</div>
      )}
    </div>
  )
}
