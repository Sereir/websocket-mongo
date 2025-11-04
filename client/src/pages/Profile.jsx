import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { getMe, setMe, isAuthed } from '../services/auth'
import Avatar from '../components/Avatar'

export default function Profile() {
  const nav = useNavigate()
  const [me, setMeState] = useState(getMe())
  const [username, setUsername] = useState(me?.username || '')
  const [email, setEmail] = useState(me?.email || '')
  const [avatar, setAvatar] = useState(me?.avatar || '')
  const [showAvatarEdit, setShowAvatarEdit] = useState(false)
  const avatarInputRef = useRef(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    if (!isAuthed()) nav('/login')
  }, [nav])

  const onSave = async () => {
    try {
      setErr(''); setMsg('')
      const body = {}
      if (username.trim() && username !== me?.username) body.username = username.trim()
      if (email.trim() && email !== me?.email) body.email = email.trim()
      if (avatar.trim() !== (me?.avatar || '')) body.avatar = avatar.trim()
      const updated = await api('/api/users/profile', { method: 'PUT', body })
      setMe(updated)
      setMeState(updated)
      setMsg('Profil mis à jour')
      setShowAvatarEdit(false)
    } catch (e) {
      setErr(e.message || 'Erreur de mise à jour')
    }
  }

  return (
    <div className="container">
      <h1>Mon profil</h1>
      <div className="card" style={{gap:12}}>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{position:'relative', cursor:'pointer'}} onClick={()=>{ setShowAvatarEdit(true); setTimeout(()=>avatarInputRef.current?.focus(), 0) }}>
            <Avatar user={{ ...me, avatar }} size={64} />
            <div style={{position:'absolute', bottom:-6, left:'50%', transform:'translateX(-50%)', fontSize:12, color:'#9aa4af'}}>Modifier</div>
          </div>
          <div className="muted">Cliquez sur l’avatar pour le modifier (URL d’image)</div>
        </div>
        {showAvatarEdit && (
          <div style={{display:'flex', gap:8, alignItems:'center'}}>
            <input ref={avatarInputRef} placeholder="https://exemple.com/mon-avatar.jpg" value={avatar} onChange={(e)=>setAvatar(e.target.value)} />
            <button onClick={()=>setAvatar('')}>Supprimer</button>
          </div>
        )}
        <label>Nom d'utilisateur</label>
        <input value={username} onChange={(e)=>setUsername(e.target.value)} />
        <label>Email</label>
        <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <div className="muted">Pour changer votre mot de passe, utilisez la page dédiée.</div>
        <button onClick={onSave}>Enregistrer</button>
        {msg && <div style={{color:'#10b981'}}>{msg}</div>}
        {err && <div className="error">{err}</div>}
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          <button onClick={()=>nav('/profile/password')}>Changer le mot de passe</button>
          <button onClick={()=>nav('/app')}>Retour au chat</button>
        </div>
      </div>
    </div>
  )
}
