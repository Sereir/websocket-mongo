import React, { useState } from 'react'

export default function Composer({ onSend, onTyping, disabled }) {
  const [text, setText] = useState('')

  const submit = () => {
    const t = text.trim()
    if (!t) return
    onSend && onSend(t)
    setText('')
  }

  return (
    <div className="composer">
      <input
        value={text}
        onChange={(e)=>{
          setText(e.target.value)
          onTyping && onTyping(e.target.value.length > 0)
        }}
        onKeyDown={(e)=>{
          if (e.key === 'Enter') submit()
        }}
        placeholder="Écrire un message..."
        disabled={disabled}
      />
      <button onClick={submit} disabled={disabled || text.trim().length === 0}>Envoyer</button>
    </div>
  )
}
