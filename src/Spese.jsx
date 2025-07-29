import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'

export default function Spese() {
  const [storico, setStorico] = useState([])
  const [errore, setErrore] = useState(null)
  const [idUtente, setIdUtente] = useState(null)

  useEffect(() => {
    const fetchStorico = async () => {
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

      const [uscite, entrate] = await Promise.all([
        supabase
          .from('Uscite')
          .select(`
            id,
            importo,
            data,
            titolo,
            Carta ( titolare ),
            Categorie ( nome )
          `)
          .eq('idUtente', utente.id),

        supabase
          .from('Entrate')
          .select(`
            id,
            importo,
            data,
            titolo,
            Carta ( titolare ),
            Categorie ( nome )
          `)
          .eq('idUtente', utente.id)
      ])

      if (uscite.error || entrate.error) {
        setErrore('Errore nel recupero di entrate o uscite')
        console.error(uscite.error || entrate.error)
        return
      }

      const taggateUscite = (uscite.data || []).map(s => ({ ...s, tipo: 'uscita' }))
      const taggateEntrate = (entrate.data || []).map(e => ({ ...e, tipo: 'entrata' }))

      const tutti = [...taggateUscite, ...taggateEntrate].sort((a, b) => new Date(b.data) - new Date(a.data))
      setStorico(tutti)
    }

    fetchStorico()
  }, [])

  return (
    <div style={{ padding: '2rem' }}>
      <Navbar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Spese</h2>
        <button style={{ fontSize: '1.5rem', padding: '0.4rem 1rem' }}>➕ Aggiungi spesa</button>
      </div>

      <hr style={{ margin: '1rem 0' }} />
      <h3>Storico</h3>

      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      {storico.length === 0 ? (
        <p>Non ci sono ancora spese o entrate registrate.</p>
      ) : (
        <ul>
          {storico.map(s => (
            <li key={s.tipo + '-' + s.id} style={{ marginBottom: '1rem' }}>
              <strong>
                [{s.tipo === 'entrata' ? 'Entrata' : 'Uscita'}] {s.titolo}
              </strong> – € {s.importo.toFixed(2)}<br />
              <small>
                Categoria: {s.Categorie?.nome || 'N/D'} – Carta: {s.Carta?.titolare || 'N/D'} – {new Date(s.data).toLocaleDateString()}
              </small>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
