// ✅ FILE: Investimenti.jsx aggiornato con eliminazione intelligente storico → saldo originale

import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'

export default function Investimenti() {
  const [idUtente, setIdUtente] = useState(null)
  const [carte, setCarte] = useState([])
  const [investimenti, setInvestimenti] = useState([])
  const [storico, setStorico] = useState([])
  const [errore, setErrore] = useState(null)

  const [mostraForm, setMostraForm] = useState(false)
  const [titolo, setTitolo] = useState('')
  const [tipo, setTipo] = useState('')
  const [data, setData] = useState('')
  const [importo, setImporto] = useState('')
  const [nota, setNota] = useState('')
  const [cartaSelezionata, setCartaSelezionata] = useState('')
  const [valoriTemporanei, setValoriTemporanei] = useState({})

  const fetchData = async () => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return setErrore("Errore autenticazione Supabase")

    const { data: utente } = await supabase
      .from('Utente')
      .select('id')
      .eq('idUUID', user.id)
      .single()

    setIdUtente(utente.id)

    const { data: carteData } = await supabase.from('Carta').select().eq('idUtente', utente.id)
    const { data: investimentiData } = await supabase.from('Investimento').select().eq('idUtente', utente.id)
    const { data: storicoData } = await supabase.from('StoricoInvestimenti').select().eq('idUtente', utente.id)

    setCarte(carteData || [])
    setInvestimenti(investimentiData || [])
    setStorico(storicoData || [])
  }

  useEffect(() => {
    fetchData()
  }, [])

  const aggiornaInvestimento = async (inv) => {
    const nuovoValore = parseFloat(valoriTemporanei[inv.id])
    if (isNaN(nuovoValore) || nuovoValore === inv.importo) return

    const differenza = nuovoValore - parseFloat(inv.importo)

    await supabase.from('StoricoInvestimenti').insert({
      idInvestimento: inv.id,
      nuovoValore,
      differenza,
      idUtente
    })

    await supabase.from('Investimento').update({ importo: nuovoValore }).eq('id', inv.id)

    const carta = carte.find(c => c.id === inv.idCarta)
    const nuovoTotale = parseFloat(carta.totale) + differenza
    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)

    setValoriTemporanei(prev => ({ ...prev, [inv.id]: '' }))
    fetchData()
  }

  const eliminaStorico = async (record) => {
    const inv = investimenti.find(i => i.id === record.idInvestimento)
    const carta = carte.find(c => c.id === inv.idCarta)
    const nuovoTotale = parseFloat(carta.totale) - record.differenza
    const nuovoImporto = inv.importo - record.differenza

    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)
    await supabase.from('Investimento').update({ importo: nuovoImporto }).eq('id', inv.id)
    await supabase.from('StoricoInvestimenti').delete().eq('id', record.id)
    fetchData()
  }

const eliminaInvestimento = async (inv) => {
  const carta = carte.find(c => c.id === inv.idCarta)
  if (!carta) return

  const variazioni = storico
    .filter(s => s.idInvestimento === inv.id)
    .sort((a, b) => new Date(a.data) - new Date(b.data)) // ordine cronologico

  // Elimina ogni storico uno per uno, aggiornando ogni volta
  for (const s of variazioni) {
    const nuovoTotaleCarta = parseFloat(carta.totale) - s.differenza
    const nuovoImportoInvestimento = parseFloat(inv.importo) - s.differenza

    await supabase.from('Carta').update({ totale: nuovoTotaleCarta }).eq('id', carta.id)
    await supabase.from('Investimento').update({ importo: nuovoImportoInvestimento }).eq('id', inv.id)
    await supabase.from('StoricoInvestimenti').delete().eq('id', s.id)

    // aggiorna lo stato locale se vuoi evitare flicker
    inv.importo = nuovoImportoInvestimento
    carta.totale = nuovoTotaleCarta
  }

  // Ora che è tornato al valore iniziale, ripristina l'importo iniziale alla carta
  const nuovoTotaleFinale = parseFloat(carta.totale) + parseFloat(inv.ImportoIniziale ?? 0)
  await supabase.from('Carta').update({ totale: nuovoTotaleFinale }).eq('id', carta.id)

  // Infine elimina l’investimento
  await supabase.from('Investimento').delete().eq('id', inv.id)

  fetchData()
}


  const aggiungiInvestimento = async e => {
    e.preventDefault()
    const iniziale = parseFloat(importo)

    const { error } = await supabase.from('Investimento').insert({
      titolo,
      tipo,
      data,
      importo: iniziale,
      ImportoIniziale: iniziale,
      note: nota,
      idCarta: parseInt(cartaSelezionata),
      idUtente
    })

    if (error) {
      console.error("Errore Supabase:", error)
      return setErrore("Errore inserimento: " + error.message)
    }

    const carta = carte.find(c => c.id === parseInt(cartaSelezionata))
    const nuovoTotale = parseFloat(carta.totale) - iniziale
    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)

    setTitolo('')
    setTipo('')
    setData('')
    setImporto('')
    setNota('')
    setCartaSelezionata('')
    setMostraForm(false)
    fetchData()
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Navbar />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2>💼 Investimenti</h2>
        <button onClick={() => setMostraForm(prev => !prev)}>
          {mostraForm ? '✖️ Chiudi' : '➕ Aggiungi investimento'}
        </button>
      </div>

      {mostraForm && (
        <form onSubmit={aggiungiInvestimento} style={{ marginTop: '1rem', border: '1px solid #ccc', padding: '1rem' }}>
          <div>
            <label>Titolo:</label><br />
            <input value={titolo} onChange={e => setTitolo(e.target.value)} required />
          </div>
          <div>
            <label>Tipo:</label><br />
            <input value={tipo} onChange={e => setTipo(e.target.value)} required />
          </div>
          <div>
            <label>Data:</label><br />
            <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          </div>
          <div>
            <label>Importo iniziale (€):</label><br />
            <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} required />
          </div>
          <div>
            <label>Carta:</label><br />
            <select value={cartaSelezionata} onChange={e => setCartaSelezionata(e.target.value)} required>
              <option value="">-- Seleziona carta --</option>
              {carte.map(c => (
                <option key={c.id} value={c.id}>{c.titolare}</option>
              ))}
            </select>
          </div>
          <div>
            <label>Note:</label><br />
            <textarea value={nota} onChange={e => setNota(e.target.value)} />
          </div>
          <button type="submit">📏 Salva</button>
        </form>
      )}

      <hr />

      {carte.map(carta => (
        <div key={carta.id} style={{ border: '1px solid #aaa', padding: '1rem', marginBottom: '2rem' }}>
          <h4>{carta.titolare} – Totale: € {carta.totale.toFixed(2)}</h4>
          {investimenti.filter(i => i.idCarta === carta.id).map(inv => (
            <div key={inv.id} style={{ backgroundColor: '#f5f5f5', padding: '0.5rem', margin: '0.5rem 0' }}>
              <strong>{inv.titolo}</strong> ({inv.tipo}) – € {inv.importo.toFixed(2)}<br />
              Iniziale: € {(inv.ImportoIniziale ?? 0).toFixed(2)}<br />
              <small>{inv.note}</small>
              <div style={{ marginTop: '0.5rem' }}>
                <label>Nuovo valore:</label>
                <input
                  type="number"
                  step="0.01"
                  value={valoriTemporanei[inv.id] || ''}
                  onChange={e => setValoriTemporanei(prev => ({ ...prev, [inv.id]: e.target.value }))}
                  style={{ marginRight: '0.5rem' }}
                />
                <button onClick={() => aggiornaInvestimento(inv)}>📏 Aggiorna</button>
                <button onClick={() => eliminaInvestimento(inv)} style={{ marginLeft: '0.5rem', color: 'red' }}>🔚️ Elimina</button>
              </div>
              <details style={{ marginTop: '0.5rem' }}>
                <summary>📊 Storico variazioni</summary>
                <ul>
                  {storico
                    .filter(v => v.idInvestimento === inv.id)
                    .sort((a, b) => new Date(b.data) - new Date(a.data))
                    .map(v => (
                      <li key={v.id}>
                        {v.data}: € {v.nuovoValore.toFixed(2)} ({v.differenza >= 0 ? '+' : ''}{v.differenza})
                        <button onClick={() => eliminaStorico(v)} style={{ marginLeft: '1rem', color: 'crimson' }}>❌</button>
                      </li>
                    ))}
                </ul>
              </details>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
