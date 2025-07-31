import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'

export default function Spese() {
  const [storico, setStorico] = useState([])
  const [errore, setErrore] = useState(null)
  const [idUtente, setIdUtente] = useState(null)

  const [mostraForm, setMostraForm] = useState(false)
  const [titolo, setTitolo] = useState('')
  const [data, setData] = useState('')
  const [importo, setImporto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [carta, setCarta] = useState('')
  const [tipoTransazione, setTipoTransazione] = useState('uscita') // 'entrata' o 'uscita'
  const [categorie, setCategorie] = useState([])
  const [carte, setCarte] = useState([])

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

    const { data: categorieData } = await supabase.from('Categorie').select()
    const { data: carteData } = await supabase.from('Carta').select().eq('idUtente', utente.id)
    setCategorie(categorieData || [])
    setCarte(carteData || [])

    const [uscite, entrate] = await Promise.all([
      supabase
        .from('Uscite')
        .select(`
          id,
          importo,
          data,
          titolo,
          idCarta,
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
          idCarta,
          Carta ( titolare ),
          Categorie ( nome )
        `)
        .eq('idUtente', utente.id)
    ])

    if (uscite.error || entrate.error) {
      setErrore('Errore nel recupero di entrate o uscite')
      return
    }

    const taggateUscite = (uscite.data || []).map(s => ({ ...s, tipo: 'uscita' }))
    const taggateEntrate = (entrate.data || []).map(e => ({ ...e, tipo: 'entrata' }))
    const tutti = [...taggateUscite, ...taggateEntrate].sort((a, b) => new Date(b.data) - new Date(a.data))
    setStorico(tutti)
  }

  useEffect(() => {
    fetchStorico()
  }, [])

  const aggiornaSaldoCarta = async (idCarta, importo, tipo) => {
    const carta = carte.find(c => c.id === parseInt(idCarta))
    if (!carta) return

    const nuovoTotale = tipo === 'entrata'
      ? carta.totale + parseFloat(importo)
      : carta.totale - parseFloat(importo)

    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', idCarta)
  }

  const eliminaTransazione = async (transazione) => {
    const tabella = transazione.tipo === 'uscita' ? 'Uscite' : 'Entrate'

    // Ripristina saldo
    await aggiornaSaldoCarta(transazione.idCarta, transazione.importo, transazione.tipo === 'entrata' ? 'uscita' : 'entrata')

    const { error } = await supabase.from(tabella).delete().eq('id', transazione.id)
    if (error) {
      setErrore("Errore nella cancellazione: " + error.message)
    } else {
      fetchStorico()
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const tabella = tipoTransazione === 'uscita' ? 'Uscite' : 'Entrate'

    const { error } = await supabase.from(tabella).insert({
      titolo,
      importo: parseFloat(importo),
      data,
      idCategoria: parseInt(categoria),
      idCarta: parseInt(carta),
      idUtente
    })

    if (error) {
      setErrore("Errore nell'inserimento: " + error.message)
    } else {
      await aggiornaSaldoCarta(carta, importo, tipoTransazione)
      setTitolo('')
      setData('')
      setImporto('')
      setCategoria('')
      setCarta('')
      setMostraForm(false)
      fetchStorico()
    }
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Navbar />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>Spese</h2>
        <button
          onClick={() => setMostraForm(prev => !prev)}
          style={{ fontSize: '1.5rem', padding: '0.4rem 1rem' }}
        >
          {mostraForm ? '✖️ Chiudi' : '➕ Aggiungi'}
        </button>
      </div>

      <hr style={{ margin: '1rem 0' }} />
      <h3>Storico</h3>

      {/* PREVIEW SALDO CARTA */}
      {carte.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '1rem', backgroundColor: '#f3f3f3', borderRadius: '8px' }}>
          <strong>Saldo attuale carte:</strong>
          <ul>
            {carte.map(c => (
              <li key={c.id}>
                {c.titolare} – € {c.totale.toFixed(2)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {mostraForm && (
        <form onSubmit={handleSubmit}
          style={{ margin: '1rem 0', padding: '1rem', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h4>Nuova Transazione</h4>

          <div>
            <label>Tipo:</label><br />
            <select value={tipoTransazione} onChange={e => setTipoTransazione(e.target.value)}>
              <option value="uscita">Uscita</option>
              <option value="entrata">Entrata</option>
            </select>
          </div>

          <div>
            <label>Titolo:</label><br />
            <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} required />
          </div>

          <div>
            <label>Data:</label><br />
            <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          </div>

          <div>
            <label>Importo (€):</label><br />
            <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} required />
          </div>

          <div>
            <label>Categoria:</label><br />
            <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
              <option value="">-- Seleziona categoria --</option>
              {categorie.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Carta:</label><br />
            <select value={carta} onChange={e => setCarta(e.target.value)} required>
              <option value="">-- Seleziona carta --</option>
              {carte.map(c => (
                <option key={c.id} value={c.id}>{c.titolare}</option>
              ))}
            </select>
          </div>

          <button type="submit">💾 Salva</button>
        </form>
      )}

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
              </small><br />
              <button onClick={() => eliminaTransazione(s)} style={{ marginTop: '0.3rem' }}>🗑️ Elimina</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
