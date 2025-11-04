import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { clearMe, clearToken, getMe, getToken, isAuthed } from '../services/auth'
import { connectSocket, disconnectSocket, getSocket } from '../services/socket'
import ConversationList from '../components/ConversationList'
import MessageList from '../components/MessageList'
import Composer from '../components/Composer'
import UserList from '../components/UserList'
import Avatar from '../components/Avatar'

export default function Chat() {
  const nav = useNavigate()
  const [me, setMe] = useState(getMe())
  const [convs, setConvs] = useState([])
  const [users, setUsers] = useState([])
  const [selected, setSelected] = useState(null) // user
  const [messages, setMessages] = useState([])
  const [typing, setTyping] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    if (!isAuthed() || !getToken()) {
      nav('/login')
      return
    }
  refreshConversations()
  refreshUsers()
    const s = connectSocket()

    const onMessage = (m) => {
      if (selected && String(m.sender) === String(selected.id || selected._id)) {
        setMessages((prev) => [...prev, m])
      }
      refreshConversations()
    }

    const onTyping = (p) => {
      if (!selected) return
      if (String(p.from) === String(selected.id || selected._id)) {
        setTyping(!!p.typing)
      }
    }

    const onMsgRead = ({ messageId }) => {
      setMessages((prev) => prev.map((m) => (m._id === messageId ? { ...m, status: 'read' } : m)))
    }

    s.on('message', onMessage)
    s.on('typing', onTyping)
    s.on('message-read', onMsgRead)

    return () => {
      s.off('message', onMessage)
      s.off('typing', onTyping)
      s.off('message-read', onMsgRead)
    }
  }, [selected?.id])

  const refreshConversations = async () => {
    try {
      const items = await api('/api/conversations')
      setConvs(items)
    } catch { /* ignore */ }
  }

  const refreshUsers = async () => {
    try {
      const r = await api('/api/users?limit=50')
      setUsers(r?.data || [])
    } catch { /* ignore */ }
  }

  // Recherche avec debounce
  useEffect(() => {
    let t
    async function run() {
      if (!query.trim()) { setSearching(false); return refreshUsers() }
      try {
        setSearching(true)
        const r = await api(`/api/users/search?q=${encodeURIComponent(query)}`)
        setUsers(r?.data || [])
      } finally {
        setSearching(false)
      }
    }
    t = setTimeout(run, 250)
    return () => clearTimeout(t)
  }, [query])

  const openConversation = async (other) => {
    setSelected(other)
    setLoading(true)
    try {
      const r = await api(`/api/messages/${other.id || other._id}`)
      const data = (r?.data || []).slice().reverse()
      setMessages(data)
      refreshConversations()
    } catch (e) {
      setMessages([])
    } finally {
      setLoading(false)
      setTyping(false)
    }
  }

  const onLogout = async () => {
    try { await api('/api/auth/logout', { method: 'POST' }) } catch {}
    clearToken(); clearMe(); disconnectSocket();
    nav('/login')
  }

  const onSend = (text) => {
    if (!selected) return
    const s = getSocket()
    const payload = { to: String(selected.id || selected._id), content: text }
    s.emit('send-message', payload, (ack) => {
      if (ack?.ok) {
        const msg = { _id: ack.id, sender: String(me._id || me.id), recipient: String(selected.id || selected._id), content: text, status: 'sent', createdAt: new Date().toISOString() }
        setMessages((prev) => [...prev, msg])
        refreshConversations()
      }
    })
  }

  const onEditMessage = async (msg) => {
    const next = prompt('Modifier le message :', msg.content)
    if (next == null) return
    const content = String(next).trim()
    if (!content) return
    try {
      const updated = await api(`/api/messages/${msg._id}`, { method: 'PUT', body: { content } })
      setMessages((prev)=> prev.map(m => m._id === msg._id ? { ...m, content: updated.content, edited: updated.edited } : m))
    } catch (e) {
      // optionnel: toast
    }
  }

  const onDeleteMessage = async (msg) => {
    if (!confirm('Supprimer ce message ?')) return
    try {
      await api(`/api/messages/${msg._id}`, { method: 'DELETE' })
      setMessages((prev)=> prev.filter(m => m._id !== msg._id))
      refreshConversations()
    } catch (e) {
      // optionnel: toast
    }
  }

  const onTypingSend = (typing) => {
    if (!selected) return
    const s = getSocket()
    s.emit('typing', { to: String(selected.id || selected._id), typing })
  }

  const currentOther = useMemo(() => {
    const id = selected?.id || selected?._id
    if (!id) return null
    return selected
  }, [selected])

  return (
    <div className="chat-layout">
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="user-row">
            <div className="user-info" onClick={()=>nav('/profile')} style={{cursor:'pointer'}}>
              <Avatar user={me} className="mr" />
              <div className="user-name">{me?.username || me?.email}</div>
            </div>
            <button className="logout" onClick={onLogout}>Déconnexion</button>
          </div>
        </div>
        <div className="section">
          <div className="section-title">Conversations</div>
          <ConversationList items={convs} selectedUserId={selected?.id || selected?._id} onSelect={openConversation} />
        </div>
        <div className="section">
          <div className="section-title">Utilisateurs</div>
          <div className="search-row">
            <input className="search" placeholder="Rechercher un utilisateur..." value={query} onChange={(e)=>setQuery(e.target.value)} />
          </div>
          <UserList users={users} selectedUserId={selected?.id || selected?._id} onSelect={openConversation} />
        </div>
      </aside>
      <main className="chat-main">
        {!currentOther && <div className="empty">Sélectionnez une conversation</div>}
        {currentOther && (
          <>
            <div className="chat-header">
              <div className="chat-peer">
                <Avatar user={currentOther} className="mr" />
                <div className="peer-info">
                  <div className="title">{currentOther.username}</div>
                  <div className="muted">{currentOther.status === 'online' ? 'En ligne' : 'Hors ligne'}</div>
                </div>
              </div>
            </div>
            <MessageList messages={messages} meId={me?._id || me?.id} me={me} other={currentOther} typing={typing} onEdit={onEditMessage} onDelete={onDeleteMessage} />
            <Composer onSend={onSend} onTyping={onTypingSend} disabled={loading} />
          </>
        )}
      </main>
    </div>
  )
}
