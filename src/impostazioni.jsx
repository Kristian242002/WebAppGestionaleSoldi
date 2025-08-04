import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'
import './impostazioni.css'

export default function Impostazioni() {
  const [utente, setUtente] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [listaUtenti, setListaUtenti] = useState([])

  useEffect(() => {
    const fetchUtente = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (!user || error) {
        console.error("Utente non loggato:", error)
        return
      }

      const { data: dbUtente, error: dbErr } = await supabase
        .from('Utente')
        .select('*')
        .eq('idUUID', user.id)
        .single()

      if (dbErr || !dbUtente) {
        console.error("Errore nel recupero utente dal DB:", dbErr)
        return
      }

      setUtente({ ...dbUtente, email: user.email })
      setAdmin(dbUtente.admin || false)

      if (dbUtente.admin) {
        const { data: utenti } = await supabase.from('Utente').select('*')
        setListaUtenti(utenti)
      }
    }

    fetchUtente()
  }, [])

  const cambiaPassword = async () => {
    if (nuovaPassword.length < 6) return alert("La password deve contenere almeno 6 caratteri.")
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    if (!error) alert("Password cambiata correttamente.")
  }

  const eliminaUtente = async (utenteDaEliminare) => {
    const conferma = confirm(`Vuoi davvero eliminare ${utenteDaEliminare.nome}?`)
    if (!conferma) return

    await supabase.auth.admin.deleteUser(utenteDaEliminare.idUUID)
    await supabase.from('Utente').delete().eq('id', utenteDaEliminare.id)

    setListaUtenti(prev => prev.filter(u => u.id !== utenteDaEliminare.id))
    alert("Utente eliminato con successo.")
  }

  return (
    <div>
      <Navbar />
      <div className="impostazioni-container">
        <div className="impostazioni-wrapper">
          <h2 className="title">Impostazioni Account</h2>

          <div className="section">
            <h3>Modifica password</h3>
            {utente?.email === "admin@gmail.com" ? (
              <p className="warning-msg">L'utente amministratore non può modificare la password.</p>
            ) : (
              <>
                <input
                  type="password"
                  placeholder="Nuova password"
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                />
                <button className="btn" onClick={cambiaPassword}>Salva password</button>
              </>
            )}
          </div>

          {admin && (
            <div className="section">
              <h3>Gestione utenti</h3>
              <ul className="utenti-list">
                {listaUtenti.map(u => (
                  <li key={u.id}>
                    {u.nome} {u.cognome} ({u.nomeUtente})
                    <button className="btn-delete" onClick={() => eliminaUtente(u)}>Elimina</button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
