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
  const [editId, setEditId] = useState(null)
  const [nuovoTotale, setNuovoTotale] = useState('')
  const [toast, setToast] = useState(false)

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

  const handleUpdateConto = async (id) => {
    const parsed = parseFloat(nuovoTotale)
    if (isNaN(parsed)) {
      setErrore('Inserisci un numero valido')
      return
    }

    const { error } = await supabase
      .from('Carta')
      .update({ totale: parsed })
      .eq('id', id)

    if (error) {
      setErrore('Errore durante l\'aggiornamento')
      console.error(error)
      return
    }

    setConti(prev =>
      prev.map(c => c.id === id ? { ...c, totale: parsed } : c)
    )

    setEditId(null)
    setNuovoTotale('')
    setErrore(null)
    setToast(true)
    setTimeout(() => setToast(false), 2500)
  }

  return (
    <>
      <Navbar />
      {toast && <div className="toast">Conto aggiornato con successo</div>}
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
                    {editId === c.id ? (
                      <>
                        <input
                          type="number"
                          value={nuovoTotale}
                          onChange={(e) => setNuovoTotale(e.target.value)}
                          step="0.01"
                          className="input-modifica"
                        />
                        <div className="modifica-btns">
                          <button onClick={() => handleUpdateConto(c.id)} className="btn-primary">Salva</button>
                          <button onClick={() => setEditId(null)} className="btn-annulla">Annulla</button>
                        </div>
                      </>
                    ) : (
                      <>
                        <p>Saldo: € {c.totale.toFixed(2)}</p>
                        <button
                          onClick={() => {
                            setEditId(c.id)
                            setNuovoTotale(c.totale.toFixed(2))
                          }}
                          className="btn-modifica"
                        >
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDeleteConto(c.id)}
                          className="delete-btn"
                          aria-label="Elimina conto"
                        >
                          ✕
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
