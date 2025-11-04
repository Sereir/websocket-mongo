import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { setToken, setMe, isAuthed } from '../services/auth'
import { api } from '../services/api'

export default function Login() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')

  if (isAuthed()) {
    nav('/app')
  }

  const onLogin = async () => {
    try {
      setErr('')
      const data = await api('/api/auth/login', { method: 'POST', body: { email, password } })
      setToken(data.token)
      setMe(data.user)
      nav('/app')
    } catch (e) {
      setErr('Connexion échouée')
    }
  }

  return (
    <div className="container">
      <h1>Connexion</h1>
      <div className="card">
        <input placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input type="password" placeholder="Mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button onClick={onLogin}>Se connecter</button>
        {err && <div className="error">{err}</div>}
        <div className="muted">Pas de compte ? <Link to="/register">Créer un compte</Link></div>
      </div>
    </div>
  )
}
