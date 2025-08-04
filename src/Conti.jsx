import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'
import './Conti.css'

export default function Conti() {
  const [conti, setConti] = useState([])
  const [titolare, setTitolare] = useState('')
  const [totale, setTotale] = useState('')
  const [idUtente, setIdUtente] = useState(null)
  const [errore, setErrore] = useState(null)

  useEffect(() => {
    const fetchConti = async () => {
      const { data: { user }, error } = await supabase.auth.getUser()
      if (error || !user) {
        setErrore('Errore nel recupero utente Supabase')
        return
      }

      const { data: utente, error: errUtente } = await supabase
        .from('Utente')
        .select('id')
        .eq('idUUID', user.id)
        .single()

      if (errUtente || !utente) {
        setErrore('Utente non trovato nel sistema')
        return
      }

      setIdUtente(utente.id)

      const { data: contiData, error: errConti } = await supabase
        .from('Carta')
        .select('*')
        .eq('idUtente', utente.id)

      if (errConti) setErrore('Errore nel recupero conti')
      else setConti(contiData)
    }

    fetchConti()
  }, [])

  const handleAddConto = async (e) => {
    e.preventDefault()

    if (!titolare || !totale) {
      setErrore('Inserisci tutti i campi')
      return
    }

    const { error } = await supabase
      .from('Carta')
      .insert({
        titolare,
        totale: parseFloat(totale),
        idUtente
      })

    if (error) {
      console.error("Errore inserimento:", error)
      setErrore('Errore durante l\'inserimento')
      return
    }

    setTitolare('')
    setTotale('')
    setErrore(null)

    const { data: aggiornata } = await supabase
      .from('Carta')
      .select('*')
      .eq('idUtente', idUtente)

    setConti(aggiornata)
  }

  const handleDeleteConto = async (id) => {
    const { error } = await supabase
      .from('Carta')
      .delete()
      .eq('id', id)

    if (error) {
      setErrore('Errore durante l\'eliminazione')
      console.error(error)
      return
    }

    setConti(prev => prev.filter(c => c.id !== id))
  }

  return (
    <>
      <Navbar />
      <div className="conti-container">
        <div className="conti-wrapper">
          <h2>I tuoi conti</h2>

          <form className="form-conti" onSubmit={handleAddConto}>
            <input
              type="text"
              placeholder="Titolare o nome conto"
              value={titolare}
              onChange={(e) => setTitolare(e.target.value)}
              required
            />
            <input
              type="number"
              placeholder="Totale iniziale (€)"
              value={totale}
              onChange={(e) => setTotale(e.target.value)}
              step="0.01"
              required
            />
            <button type="submit" className="btn-primary">Aggiungi conto</button>
          </form>

          {errore && <p className="errore-msg">{errore}</p>}

          {conti.length === 0 ? (
            <p className="no-conti">Nessun conto trovato.</p>
          ) : (
            <div className="conti-list">
              {conti.map(c => (
                <div className="conto-card" key={c.id}>
                  <div className="conto-info">
                    <h3>{c.titolare}</h3>
                    <p>Saldo: € {c.totale.toFixed(2)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteConto(c.id)}
                    className="delete-btn"
                    aria-label="Elimina conto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
