import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import './Navbar.css'
import logo from './Img/logo.png'

export default function Navbar() {
  const navigate = useNavigate()

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      navigate('/')
    } else {
      console.error('Errore durante il logout:', error.message)
    }
  }

  return (
    <>
      <nav className="navbar">
        <div className="navbar-section navbar-left">
          <img src={logo} alt="MyCash Logo" className="navbar-logo" />
          <span className="navbar-title">MyCash</span>
        </div>

        <div className="navbar-section navbar-center">
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/conti">Conti</Link>
          <Link to="/spese">Spese</Link>
          <Link to="/investimento">Investimenti</Link>
          <Link to="/statistiche">Statistiche</Link>
          <Link to="/impostazioni">Impostazioni</Link>
        </div>

        <div className="navbar-section navbar-right">
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="navbar-spacer"></div>
    </>
  )
}
