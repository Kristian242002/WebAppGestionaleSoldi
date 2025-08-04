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
  const [pagina, setPagina] = useState(1)
  const perPagina = 5

  const fetchStorico = async (paginaCorrente = 1) => {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return setErrore('Errore nel recupero utente Supabase')

    const { data: utente, error: errUtente } = await supabase
      .from('Utente')
      .select('id')
      .eq('idUUID', user.id)
      .single()

    if (errUtente || !utente) return setErrore('Utente non trovato nel sistema')
    setIdUtente(utente.id)

    const { data: categorieData } = await supabase.from('Categorie').select()
    const { data: carteData } = await supabase.from('Carta').select().eq('idUtente', utente.id)
    setCategorie(categorieData || [])
    setCarte(carteData || [])

    const [uscite, entrate] = await Promise.all([
      supabase
        .from('Uscite')
        .select(`
          id, importo, data, titolo, idCarta,
          Carta ( titolare ), Categorie ( nome )
        `)
        .eq('idUtente', utente.id),

      supabase
        .from('Entrate')
        .select(`
          id, importo, data, titolo, idCarta,
          Carta ( titolare ), Categorie ( nome )
        `)
        .eq('idUtente', utente.id)
    ])

    if (uscite.error || entrate.error) return setErrore('Errore nel recupero di entrate o uscite')

    const taggateUscite = (uscite.data || []).map(s => ({ ...s, tipo: 'uscita' }))
    const taggateEntrate = (entrate.data || []).map(e => ({ ...e, tipo: 'entrata' }))
    const tutti = [...taggateUscite, ...taggateEntrate].sort((a, b) => new Date(b.data) - new Date(a.data))

    const filtrati = tutti.filter(t => {
      if (filtro === 'tutti') return true
      return t.tipo === filtro
    })

    const start = 0
    const end = perPagina * paginaCorrente
    setStorico(filtrati.slice(0, end))
  }

  useEffect(() => {
    fetchStorico(pagina)
  }, [filtro, pagina])

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
    await aggiornaSaldoCarta(transazione.idCarta, transazione.importo, transazione.tipo === 'entrata' ? 'uscita' : 'entrata')
    const { error } = await supabase.from(tabella).delete().eq('id', transazione.id)
    if (!error) fetchStorico(pagina)
    else setErrore("Errore nella cancellazione: " + error.message)
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

    if (error) setErrore("Errore nell'inserimento: " + error.message)
    else {
      await aggiornaSaldoCarta(carta, importo, tipoTransazione)
      setTitolo('')
      setData('')
      setImporto('')
      setCategoria('')
      setCarta('')
      setMostraForm(false)
      fetchStorico(pagina)
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

  <div className="filtro-transazioni">
    <label htmlFor="filtro">Filtra:</label>
    <select
      id="filtro"
      value={filtro}
      onChange={e => {
        setPagina(1);
        setFiltro(e.target.value);
      }}
    >
      <option value="tutti">Tutte</option>
      <option value="entrata">Entrate</option>
      <option value="uscita">Uscite</option>
    </select>
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
              € {s.importo.toFixed(2)}<br />
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
