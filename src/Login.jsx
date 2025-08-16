import { useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'
import './Login.css'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errore, setErrore] = useState(null)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      setErrore(error.message)
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <div className="login-container">
      <div className="login-box">
        <h2 className="login-title">Benvenuto!</h2>
        <form onSubmit={handleLogin} className="login-form">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="login-input"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="login-input"
          />
          <button type="submit" className="login-button">Accedi</button>
          {errore && <p className="login-error">{errore}</p>}
        </form>

        <p className="login-info">
          <strong>Credenziali demo:</strong><br />
          Email: <code>admin@gmail.com</code><br />
          Password: <code>admin1234</code><br />
          Vuoi un account personale? <a href="mailto:kristianxhani20@gmail.com">Contattami</a>
        </p>

        <p className="login-version">Versione 0.0.2</p>
      </div>
    </div>
  )
}
