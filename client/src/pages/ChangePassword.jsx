import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { isAuthed } from '../services/auth'

export default function ChangePassword() {
  const nav = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  if (!isAuthed()) nav('/login')

  const onChange = async () => {
    try {
      setErr(''); setMsg('')
      if (!currentPassword || !newPassword) throw new Error('Champs requis')
      if (newPassword.length < 6) throw new Error('Mot de passe trop court (min 6)')
      if (newPassword !== confirm) throw new Error('La confirmation ne correspond pas')
      await api('/api/users/password', { method: 'PUT', body: { currentPassword, newPassword } })
      setMsg('Mot de passe modifié')
      setCurrentPassword(''); setNewPassword(''); setConfirm('')
    } catch (e) {
      setErr(e.message || 'Échec de la modification')
    }
  }

  return (
    <div className="container">
      <h1>Changer le mot de passe</h1>
      <div className="card" style={{gap:12}}>
        <label>Mot de passe actuel</label>
        <input type="password" value={currentPassword} onChange={(e)=>setCurrentPassword(e.target.value)} />
        <label>Nouveau mot de passe</label>
        <input type="password" value={newPassword} onChange={(e)=>setNewPassword(e.target.value)} />
        <label>Confirmer le nouveau mot de passe</label>
        <input type="password" value={confirm} onChange={(e)=>setConfirm(e.target.value)} />
        <button onClick={onChange}>Valider</button>
        {msg && <div style={{color:'#10b981'}}>{msg}</div>}
        {err && <div className="error">{err}</div>}
        <button onClick={()=>nav('/profile')}>Retour au profil</button>
      </div>
    </div>
  )
}
