import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setToken, setMe, isAuthed } from '../services/auth'
import { api } from '../services/api'

export default function Register() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [err, setErr] = useState('')

  if (isAuthed()) nav('/app')

  const onRegister = async () => {
    try {
      setErr('')
      const body = { email, password }
      if (username.trim()) body.username = username.trim()
      const data = await api('/api/auth/register', { method: 'POST', body })
      setToken(data.token)
      setMe(data.user)
      nav('/app')
    } catch (e) {
      setErr('Inscription échouée')
    }
  }

  return (
    <div className="container">
      <h1>Inscription</h1>
      <div className="card">
        <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <input placeholder="Nom d'utilisateur (optionnel)" value={username} onChange={(e)=>setUsername(e.target.value)} />
        <button onClick={onRegister}>Créer un compte</button>
        {err && <div className="error">{err}</div>}
        <div className="muted">Déjà un compte ? <Link to="/login">Se connecter</Link></div>
      </div>
    </div>
  )
}
