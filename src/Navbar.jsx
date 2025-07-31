import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from './supabaseClient'

export default function Navbar() {
  const [imgUrl, setImgUrl] = useState(null)

  useEffect(() => {
    const fetchImg = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        console.error('Errore auth:', error)
        return
      }

      const { data: utente, error: err2 } = await supabase
        .from('Utente')
        .select('urlPic')
        .eq('idUUID', user.id)
        .single()

      if (err2) {
        console.error('Errore caricamento utente:', err2)
        return
      }

      console.log('✅ IMG URL LETTO:', utente?.urlPic)

      if (utente?.urlPic) {
        setImgUrl(utente.urlPic)
      }
    }

    fetchImg()
  }, [])

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
        <Link to="/investimento" style={{ color: 'white', textDecoration: 'none' }}>I tuoi Investimenti</Link>
        <Link to="/conti" style={{ color: 'white', textDecoration: 'none' }}>Statistiche</Link>
        <Link to="/impostazioni" style={{ color: 'white', textDecoration: 'none' }}>Impostazioni</Link>
        <Link to="/spese" style={{ color: 'white', textDecoration: 'none' }}>LogOut</Link>
      </div>

      <div>
        {imgUrl ? (
          <img
            src={imgUrl}
            alt="Profilo"
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2px solid white',
              backgroundColor: '#444'
            }}
          />
        ) : (
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontWeight: 'bold',
            fontSize: '1.2rem'
          }}>
            ?
          </div>
        )}
      </div>
    </nav>
  )
}
