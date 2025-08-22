import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'
import { Line } from 'react-chartjs-2'
import './investimento.css'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, LineElement, PointElement, Title, Tooltip, Legend)

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
  const [graficoSelezionato, setGraficoSelezionato] = useState(null)

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const aggiornaInvestimento = async (inv) => {
    const nuovoValore = parseFloat(valoriTemporanei[inv.id]?.valore)
    const nuovaData = valoriTemporanei[inv.id]?.data || new Date().toISOString().split('T')[0]
    if (isNaN(nuovoValore) || nuovoValore === Number(inv.importo)) return

    const differenza = nuovoValore - Number(inv.importo)

    await supabase.from('StoricoInvestimenti').insert({
      idInvestimento: inv.id,
      nuovoValore,
      differenza,
      data: nuovaData,
      idUtente
    })

    await supabase.from('Investimento').update({ importo: nuovoValore }).eq('id', inv.id)

    const carta = carte.find(c => c.id === inv.idCarta)
    if (carta) {
      const nuovoTotale = Number(carta.totale) + differenza
      await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)
    }

    setValoriTemporanei(prev => ({ ...prev, [inv.id]: { valore: '', data: '' } }))
    fetchData()
  }

  // 🔥 NUOVO: aggiungi fondi all'investimento (aumenta importo e scala dalla carta)
  const aggiungiFondi = async (inv) => {
    const importoAggiunta = parseFloat(valoriTemporanei[inv.id]?.aggiunta)
    const dataAggiunta = valoriTemporanei[inv.id]?.aggiuntaData || new Date().toISOString().split('T')[0]
    if (isNaN(importoAggiunta) || importoAggiunta <= 0) return

    const valoreAttuale = Number(inv.importo)
    const nuovoValore = valoreAttuale + importoAggiunta

    // Storico (differenza positiva)
    await supabase.from('StoricoInvestimenti').insert({
      idInvestimento: inv.id,
      nuovoValore,
      differenza: importoAggiunta,
      data: dataAggiunta,
      idUtente
    })

    // Aggiorna investimento
    await supabase.from('Investimento').update({ importo: nuovoValore }).eq('id', inv.id)

    // Scala dalla carta collegata
    const carta = carte.find(c => c.id === inv.idCarta)
    if (carta) {
      const nuovoTotaleCarta = Number(carta.totale) - importoAggiunta
      await supabase.from('Carta').update({ totale: nuovoTotaleCarta }).eq('id', carta.id)
    }

    // pulizia input locali
    setValoriTemporanei(prev => ({
      ...prev,
      [inv.id]: { ...(prev[inv.id] || {}), aggiunta: '', aggiuntaData: '' }
    }))

    fetchData()
  }

  const eliminaInvestimento = async (inv) => {
    const carta = carte.find(c => c.id === inv.idCarta)
    if (!carta) return

    const variazioni = storico.filter(s => s.idInvestimento === inv.id)
    // ripristina carta e importo investimento togliendo ogni variazione
    for (const s of variazioni) {
      const nuovoTotaleCarta = Number(carta.totale) - Number(s.differenza)
      const nuovoImportoInvestimento = Number(inv.importo) - Number(s.differenza)
      await supabase.from('Carta').update({ totale: nuovoTotaleCarta }).eq('id', carta.id)
      await supabase.from('Investimento').update({ importo: nuovoImportoInvestimento }).eq('id', inv.id)
      await supabase.from('StoricoInvestimenti').delete().eq('id', s.id)
      inv.importo = nuovoImportoInvestimento
      carta.totale = nuovoTotaleCarta
    }

    const nuovoTotaleFinale = Number(carta.totale) + Number(inv.ImportoIniziale ?? 0)
    await supabase.from('Carta').update({ totale: nuovoTotaleFinale }).eq('id', carta.id)
    await supabase.from('Investimento').delete().eq('id', inv.id)
    fetchData()
  }

  const vendiInvestimento = async (inv) => {
    const carta = carte.find(c => c.id === inv.idCarta)
    if (!carta) return

    const nuovoTotale = Number(carta.totale) + Number(inv.importo)
    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)

    const storici = storico.filter(s => s.idInvestimento === inv.id)
    for (const s of storici) {
      await supabase.from('StoricoInvestimenti').delete().eq('id', s.id)
    }

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
    if (carta) {
      const nuovoTotale = Number(carta.totale) - iniziale
      await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', carta.id)
    }

    setTitolo('')
    setTipo('')
    setData('')
    setImporto('')
    setNota('')
    setCartaSelezionata('')
    setMostraForm(false)
    fetchData()
  }

  const creaDatiGrafico = (idInvestimento) => {
    const investimento = investimenti.find(i => i.id === idInvestimento)
    const storicoInvestimento = storico
      .filter(s => s.idInvestimento === idInvestimento)
      .sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime())

    const etichette = [investimento.data, ...storicoInvestimento.map(s => s.data)]
    const valori = [Number(investimento.ImportoIniziale), ...storicoInvestimento.map(s => Number(s.nuovoValore))]

    return {
      labels: etichette,
      datasets: [{
        label: 'Valore €',
        data: valori,
        fill: false,
        tension: 0.3,
        borderColor: '#36a2eb',
        borderWidth: 2
      }]
    }
  }

  // Totale di tutte le azioni/investimenti
  const totaleInvestimenti = investimenti.reduce((sum, i) => sum + Number(i.importo || 0), 0)

  return (
    <div className="investimenti-container">
      <Navbar />

      <div className="investimenti-header">
        <h2>Investimenti</h2>
        {!mostraForm && (
          <button onClick={() => setMostraForm(true)}>Aggiungi</button>
        )}
      </div>

      {/* 🔝 Totale portafoglio */}
      <div className="totale-investimenti-box">
        <strong>Totale portafoglio investimenti:</strong>
        <span>€ {Number(totaleInvestimenti).toFixed(2)}</span>
      </div>

      {carte.length > 0 && (
        <div className="saldo-box">
          <strong>Saldo attuale carte</strong>
          {carte.map(c => (
            <div key={c.id} className="saldo-carta">
              <p>{c.titolare}</p>
              <span>€ {Number(c.totale).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {mostraForm && (
        <form onSubmit={aggiungiInvestimento} className="nuovo-investimento-form">
          <h4>Nuovo Investimento</h4>
          <label>Titolo:</label>
          <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} required />
          <label>Tipo:</label>
          <input type="text" value={tipo} onChange={e => setTipo(e.target.value)} required />
          <label>Data:</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />
          <label>Importo iniziale (€):</label>
          <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} required />
          <label>Carta:</label>
          <select value={cartaSelezionata} onChange={e => setCartaSelezionata(e.target.value)} required>
            <option value="">-- Seleziona carta --</option>
            {carte.map(c => (
              <option key={c.id} value={c.id}>{c.titolare}</option>
            ))}
          </select>
          <label>Note:</label>
          <textarea value={nota} onChange={e => setNota(e.target.value)} />
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button type="submit">Salva</button>
            <button type="button" onClick={() => setMostraForm(false)} style={{ backgroundColor: '#444' }}>
              Indietro
            </button>
          </div>
        </form>
      )}

      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      {investimenti.map(inv => (
        <div key={inv.id} className="investimento-item">
          <div className="investimento-header">
            <strong>{inv.titolo}</strong> ({inv.tipo}) – € {Number(inv.importo).toFixed(2)}
          </div>

          <div className="investimento-actions">
            {/* Aggiorna al nuovo valore assoluto */}
            <input
              type="number"
              step="0.01"
              placeholder="Nuovo valore"
              value={valoriTemporanei[inv.id]?.valore || ''}
              onChange={e => setValoriTemporanei(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], valore: e.target.value } }))}
            />
            <input
              type="date"
              value={valoriTemporanei[inv.id]?.data || ''}
              onChange={e => setValoriTemporanei(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], data: e.target.value } }))}
            />
            <button onClick={() => aggiornaInvestimento(inv)}>Aggiorna</button>

            {/* 🔥 NUOVI INPUT + BOTTONE: aggiungi fondi */}
            <input
              type="number"
              step="0.01"
              placeholder="Aggiungi €"
              value={valoriTemporanei[inv.id]?.aggiunta || ''}
              onChange={e => setValoriTemporanei(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], aggiunta: e.target.value } }))}
              style={{ marginLeft: '0.5rem' }}
            />
            <input
              type="date"
              value={valoriTemporanei[inv.id]?.aggiuntaData || ''}
              onChange={e => setValoriTemporanei(prev => ({ ...prev, [inv.id]: { ...prev[inv.id], aggiuntaData: e.target.value } }))}
            />
            <button onClick={() => aggiungiFondi(inv)}>Aggiungi fondi</button>

            <button onClick={() => eliminaInvestimento(inv)}>Elimina</button>
            <button onClick={() => vendiInvestimento(inv)}>Vendi</button>
            <button onClick={() => setGraficoSelezionato(graficoSelezionato === inv.id ? null : inv.id)}>
              Visualizza andamento
            </button>
          </div>

          {graficoSelezionato === inv.id && (
            <div className="grafico-container">
              <Line data={creaDatiGrafico(inv.id)} />
              <ul>
                {storico
                  .filter(s => s.idInvestimento === inv.id)
                  .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                  .map(s => (
                    <li key={s.id}>
                      {s.data}: € {Number(s.nuovoValore).toFixed(2)} ({Number(s.differenza) >= 0 ? '+' : ''}{Number(s.differenza).toFixed(2)})
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
