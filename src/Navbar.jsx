// components/Navbar.jsximport React from 'react'
import { Link } from 'react-router-dom'

export default function Navbar() {
  return (
    <nav style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '1rem 2rem',
      backgroundColor: '#1a1a1a',
      color: 'white',
      marginBottom: '2rem'
    }}>
      <div style={{ display: 'flex', gap: '2rem' }}>
        <Link to="/dashboard" style={{ color: 'white', textDecoration: 'none' }}>Dashboard</Link>
        <Link to="/conti" style={{ color: 'white', textDecoration: 'none' }}>I tuoi conti</Link>
        <Link to="/spese" style={{ color: 'white', textDecoration: 'none' }}>Le tue Spese</Link>
        <Link to="/conti" style={{ color: 'white', textDecoration: 'none' }}>I tuoi Investimenti</Link>
        <Link to="/conti" style={{ color: 'white', textDecoration: 'none' }}>Statistiche</Link>
        <Link to="/conti" style={{ color: 'white', textDecoration: 'none' }}>Entrate</Link>
        <Link to="/impostazioni" style={{ color: 'white', textDecoration: 'none' }}>Impostazioni</Link>
        <Link to="/spese" style={{ color: 'white', textDecoration: 'none' }}>LogOut</Link>
      </div>
      <div>
        <span style={{
          backgroundColor: '#444',
          borderRadius: '50%',
          padding: '0.5rem 1rem'
        }}>
          Immagine Profilo
        </span>
      </div>
    </nav>
  )
}
