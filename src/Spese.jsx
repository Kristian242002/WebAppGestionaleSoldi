import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'
import './Spese.css'

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
  const [tipoTransazione, setTipoTransazione] = useState('uscita')

  const [categorie, setCategorie] = useState([])
  const [carte, setCarte] = useState([])

  const [filtro, setFiltro] = useState('tutti')        
  const [filtroCategoria, setFiltroCategoria] = useState('tutte') 
  const [pagina, setPagina] = useState(1)
  const perPagina = 5

  const fetchStorico = async (paginaCorrente = 1) => {
    setErrore(null)

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
    const { data: categorieData } = await supabase.from('Categorie').select()
    const { data: carteData } = await supabase.from('Carta').select().eq('idUtente', utente.id)
    setCategorie(categorieData || [])
    setCarte(carteData || [])
    const [uscite, entrate] = await Promise.all([
      supabase
        .from('Uscite')
        .select(`
          id, importo, data, titolo, idCarta, idCategoria,
          Carta ( titolare ),
          Categorie ( id, nome )
        `)
        .eq('idUtente', utente.id),

      supabase
        .from('Entrate')
        .select(`
          id, importo, data, titolo, idCarta, idCategoria,
          Carta ( titolare ),
          Categorie ( id, nome )
        `)
        .eq('idUtente', utente.id)
    ])

    if (uscite.error || entrate.error) {
      setErrore('Errore nel recupero di entrate o uscite')
      return
    }

    const taggateUscite = (uscite.data || []).map(s => ({ ...s, tipo: 'uscita' }))
    const taggateEntrate = (entrate.data || []).map(e => ({ ...e, tipo: 'entrata' }))
    const tutti = [...taggateUscite, ...taggateEntrate].sort(
      (a, b) => new Date(b.data) - new Date(a.data)
    )

    const filtrati = tutti.filter(t => {
      if (filtro !== 'tutti' && t.tipo !== filtro) return false
      if (filtroCategoria !== 'tutte') {
        const idCat = Number(filtroCategoria)
        const idTransCat = t.idCategoria ?? t.Categorie?.id ?? null
        if (idTransCat !== idCat) return false
      }

      return true
    })

    const start = 0
    const end = perPagina * paginaCorrente
    setStorico(filtrati.slice(start, end))
  }

  useEffect(() => {
    fetchStorico(pagina)
  }, [filtro, filtroCategoria, pagina])

  const aggiornaSaldoCarta = async (idCarta, importo, tipo) => {
    const cartaSel = carte.find(c => c.id === parseInt(idCarta))
    if (!cartaSel) return

    const nuovoTotale = tipo === 'entrata'
      ? cartaSel.totale + parseFloat(importo)
      : cartaSel.totale - parseFloat(importo)

    await supabase.from('Carta').update({ totale: nuovoTotale }).eq('id', idCarta)
  }

  const eliminaTransazione = async (transazione) => {
    const tabella = transazione.tipo === 'uscita' ? 'Uscite' : 'Entrate'
    await aggiornaSaldoCarta(
      transazione.idCarta,
      transazione.importo,
      transazione.tipo === 'entrata' ? 'uscita' : 'entrata'
    )
    const { error } = await supabase.from(tabella).delete().eq('id', transazione.id)
    if (!error) {
      fetchStorico(pagina)
    } else {
      setErrore("Errore nella cancellazione: " + error.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const tabella = tipoTransazione === 'uscita' ? 'Uscite' : 'Entrate'
    const payload = {
      titolo,
      importo: parseFloat(importo),
      data,
      idCategoria: parseInt(categoria),
      idCarta: parseInt(carta),
      idUtente
    }

    const { error } = await supabase.from(tabella).insert(payload)

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
      setPagina(1)
      fetchStorico(1)
    }
  }

  return (
    <div className="spese-container">
      <Navbar />

      <div className="spese-header">
        <h2>Spese</h2>
        {!mostraForm && (
          <button onClick={() => setMostraForm(true)}>Aggiungi</button>
        )}
      </div>

      {/* FILTRI */}
      <div className="filtro-transazioni" style={{ display: 'grid', gap: '.75rem', gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
        <div>
          <label htmlFor="filtro">Filtra tipo:</label>
          <select
            id="filtro"
            value={filtro}
            onChange={e => {
              setPagina(1)
              setFiltro(e.target.value)
            }}
          >
            <option value="tutti">Tutte</option>
            <option value="entrata">Entrate</option>
            <option value="uscita">Uscite</option>
          </select>
        </div>

        <div>
          <label htmlFor="filtroCategoria">Categoria:</label>
          <select
            id="filtroCategoria"
            value={filtroCategoria}
            onChange={e => {
              setPagina(1)
              setFiltroCategoria(e.target.value)
            }}
          >
            <option value="tutte">Tutte le categorie</option>
            {categorie.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {carte.length > 0 && (
        <div className="saldo-box">
          <strong>Saldo attuale carte</strong>
          {carte.map(c => (
            <div key={c.id} className="saldo-carta">
              <p>{c.titolare}</p>
              <span>€ {c.totale.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}

      {mostraForm && (
        <form onSubmit={handleSubmit} className="nuova-transazione-form">
          <h4>Nuova Transazione</h4>

          <label>Tipo:</label>
          <select value={tipoTransazione} onChange={e => setTipoTransazione(e.target.value)}>
            <option value="uscita">Uscita</option>
            <option value="entrata">Entrata</option>
          </select>

          <label>Titolo:</label>
          <input type="text" value={titolo} onChange={e => setTitolo(e.target.value)} required />

          <label>Data:</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} required />

          <label>Importo (€):</label>
          <input type="number" step="0.01" value={importo} onChange={e => setImporto(e.target.value)} required />

          <label>Categoria:</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)} required>
            <option value="">-- Seleziona categoria --</option>
            {categorie.map(c => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>

          <label>Carta:</label>
          <select value={carta} onChange={e => setCarta(e.target.value)} required>
            <option value="">-- Seleziona carta --</option>
            {carte.map(c => <option key={c.id} value={c.id}>{c.titolare}</option>)}
          </select>

          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
            <button type="submit">Salva</button>
            <button type="button" onClick={() => setMostraForm(false)} style={{ backgroundColor: '#444' }}>
              Indietro
            </button>
          </div>
        </form>
      )}

      {errore && <p style={{ color: 'red' }}>{errore}</p>}

      {storico.length === 0 ? (
        <p>Non ci sono ancora spese o entrate registrate.</p>
      ) : (
        <>
          {storico.map(s => (
            <div key={s.tipo + '-' + s.id} className={`transazione-item ${s.tipo}`}>
              <strong>[{s.tipo === 'entrata' ? 'Entrata' : 'Uscita'}] {s.titolo}</strong>
              {' '}€ {Number(s.importo).toFixed(2)}<br />
              <small>
                Categoria: {s.Categorie?.nome || 'N/D'} – Carta: {s.Carta?.titolare || 'N/D'} – {new Date(s.data).toLocaleDateString()}
              </small><br />
              <button onClick={() => eliminaTransazione(s)}>Elimina</button>
            </div>
          ))}
          <button style={{ marginTop: '1rem' }} onClick={() => setPagina(prev => prev + 1)}>
            Carica altri
          </button>
        </>
      )}
    </div>
  )
}
