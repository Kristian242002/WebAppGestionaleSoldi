import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'

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

      const idUUID = user.id

      const { data: utente, error: errUtente } = await supabase
        .from('Utente')
        .select('id')
        .eq('idUUID', idUUID)
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
        titolare: titolare,
        totale: parseFloat(totale),
        idUtente: idUtente
      })

    if (error) {
      console.error("Errore inserimento:", error)
      setErrore('Errore durante l\'inserimento')
      return
    }

    // Reset form
    setTitolare('')
    setTotale('')
    setErrore(null)

    // Ricarica conti
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

    <div style={{ padding: '2rem' }}>
      <h2>I tuoi conti</h2>

      <form onSubmit={handleAddConto} style={{ marginBottom: '2rem' }}>
        <input
          type="text"
          placeholder="Titolare o nome conto"
          value={titolare}
          onChange={(e) => setTitolare(e.target.value)}
          required
        />
        <input
          type="number"
          placeholder="Totale iniziale"
          value={totale}
          onChange={(e) => setTotale(e.target.value)}
          step="0.01"
          required
        />
        <button type="submit">➕ Aggiungi conto</button>
      </form>

      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      {conti.length === 0 ? (
        <p>Nessun conto trovato.</p>
      ) : (
        <ul>
          {conti.map(c => (
            <li key={c.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span><strong>{c.titolare}</strong> – saldo: € {c.totale.toFixed(2)}</span>
              <button onClick={() => handleDeleteConto(c.id)} style={{ marginLeft: '1rem', color: 'red' }}>❌</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  </>
)

}
