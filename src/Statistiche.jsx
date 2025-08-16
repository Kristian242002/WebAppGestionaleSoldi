import { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
} from 'chart.js'
import { Bar, Pie, Line, getElementAtEvent } from 'react-chartjs-2'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import './Statistiche.css'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, LineElement, PointElement, ChartDataLabels)

export default function Statistiche() {
  const [idUtente, setIdUtente] = useState(null)
  const [carte, setCarte] = useState([])
  const [cartaSelezionata, setCartaSelezionata] = useState('')
  const [tipoMovimento, setTipoMovimento] = useState('uscite')
  const [dati, setDati] = useState([])
  const [categorie, setCategorie] = useState([])
  const [inizio, setInizio] = useState('')
  const [fine, setFine] = useState('')
  const [categorieIncluse, setCategorieIncluse] = useState([])
  const [tipoGrafico, setTipoGrafico] = useState('bar')

  // Stato per lista clic su colonna
  const [categoriaCliccata, setCategoriaCliccata] = useState(null) // { id, nome } | null
  const [listaTransazioni, setListaTransazioni] = useState([])
  const [paginaCat, setPaginaCat] = useState(1)
  const [loadingCat, setLoadingCat] = useState(false)
  const perPagina = 5

  const chartRef = useRef(null)

  useEffect(() => {
    const fetchUtente = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: utente } = await supabase.from('Utente').select('id').eq('idUUID', user.id).single()
      if (utente) setIdUtente(utente.id)
    }
    fetchUtente()
  }, [])

  useEffect(() => {
    if (!idUtente) return
    const fetchDati = async () => {
      const { data: carteDb } = await supabase.from('Carta').select('id, titolare').eq('idUtente', idUtente)
      const { data: cat } = await supabase.from('Categorie').select()
      setCarte(carteDb || [])
      setCategorie(cat || [])
      setCategorieIncluse((cat || []).map(c => c.id))
    }
    fetchDati()
  }, [idUtente])

  useEffect(() => {
    if (!idUtente || !cartaSelezionata) return
    const fetchMovimenti = async () => {
      const table = tipoMovimento === 'entrate' ? 'Entrate' : 'Uscite'
      const { data: mov } = await supabase
        .from(table)
        .select('data, importo, idCategoria')
        .eq('idUtente', idUtente)
        .eq('idCarta', cartaSelezionata)

      setDati(mov || [])
      // reset pannello categoria se cambio sorgente dati
      setCategoriaCliccata(null)
      setListaTransazioni([])
      setPaginaCat(1)
    }
    fetchMovimenti()
  }, [idUtente, cartaSelezionata, tipoMovimento])

  // Filtri base
  const datiFiltrati = dati.filter(d => {
    const dt = new Date(d.data)
    const inizioOk = !inizio || new Date(inizio) <= dt
    const fineOk = !fine || new Date(fine) >= dt
    const catOk = categorieIncluse.includes(d.idCategoria)
    return inizioOk && fineOk && catOk
  })

  // Aggregazione per categoria (solo quelle incluse e con totale > 0)
  const aggregati = categorie.map(c => {
    const totale = datiFiltrati
      .filter(d => d.idCategoria === c.id)
      .reduce((acc, cur) => acc + parseFloat(cur.importo), 0)
    return { id: c.id, nome: c.nome, totale, colore: c.coloreHex }
  }).filter(d => d.totale > 0)

  const categoriaTop = aggregati.reduce((max, cur) => cur.totale > max.totale ? cur : max, { nome: '', totale: 0 })

  const suggerimentoRisparmio = (nomeCategoria) => {
    const consigli = {
      'Cibo': 'Considera di cucinare più spesso a casa o limitare le uscite settimanali.',
      'Abbonamenti': 'Controlla se usi davvero tutti i tuoi abbonamenti mensili.',
      'Shopping': 'Fissa un budget mensile e usa una lista prima di acquistare.',
      'Trasporti': 'Valuta soluzioni di car sharing o trasporto pubblico.',
      'Altro': 'Dai un’occhiata a questa categoria, potrebbe nascondere spese evitabili.'
    }
    return consigli[nomeCategoria] || 'Valuta se ci sono spese evitabili in questa categoria.'
  }

  // Chart options + datalabels
  const optionsBase = {
    plugins: {
      datalabels: {
        anchor: 'center',
        align: 'center',
        color: '#fff',
        font: { weight: 'bold' },
        formatter: v => v.toFixed(2) + ' €'
      }
    }
  }

  // Costruisco chartData partendo dagli aggregati (già filtrati)
  const chartData = {
    labels: aggregati.map(d => d.nome),
    datasets: [{
      label: tipoMovimento === 'entrate' ? 'Entrate' : 'Uscite',
      data: aggregati.map(d => d.totale),
      backgroundColor: aggregati.map(d => d.colore || '#888')
    }]
  }

  // Handle click su barra
  const onBarClick = async (evt) => {
    if (!chartRef.current) return
    const elements = getElementAtEvent(chartRef.current, evt)
    if (!elements.length) return

    const { index } = elements[0]
    const categoriaAgg = aggregati[index]
    if (!categoriaAgg) return

    // Salvo categoria cliccata e carico pagina 1
    setCategoriaCliccata({ id: categoriaAgg.id, nome: categoriaAgg.nome })
    setPaginaCat(1)
    await fetchTransazioniCategoria(categoriaAgg.id, 1, true)
  }

  // Carica le transazioni per la categoria cliccata (paginazione client-side su fetch mirato)
  const fetchTransazioniCategoria = async (idCategoria, paginaRichiesta, replace = false) => {
    if (!idUtente || !cartaSelezionata || !idCategoria) return
    setLoadingCat(true)

    const table = tipoMovimento === 'entrate' ? 'Entrate' : 'Uscite'
    let query = supabase
      .from(table)
      .select(`
        id, titolo, importo, data, idCategoria, idCarta,
        Categorie ( nome ),
        Carta ( titolare )
      `)
      .eq('idUtente', idUtente)
      .eq('idCarta', cartaSelezionata)
      .eq('idCategoria', idCategoria)
      .order('data', { ascending: false })

    // filtro date se impostate
    if (inizio) query = query.gte('data', inizio)
    if (fine) query = query.lte('data', fine)

    const { data, error } = await query
    if (error) {
      setLoadingCat(false)
      return
    }

    // paginazione client-side stile "Spese"
    const start = 0
    const end = perPagina * paginaRichiesta
    const slice = (data || []).slice(start, end)

    setListaTransazioni(prev => replace ? slice : slice) // replace true alla prima chiamata
    setLoadingCat(false)
  }

  const caricaAltriCat = async () => {
    if (!categoriaCliccata) return
    const nuovaPagina = paginaCat + 1
    setPaginaCat(nuovaPagina)
    await fetchTransazioniCategoria(categoriaCliccata.id, nuovaPagina)
  }

  // Se cambio qualcosa tra carta/tipo/date/checkbox → chiudo pannello dettaglio
  useEffect(() => {
    setCategoriaCliccata(null)
    setListaTransazioni([])
    setPaginaCat(1)
  }, [cartaSelezionata, tipoMovimento, inizio, fine, categorieIncluse])

  const getChart = () => {
    const commonProps = { data: chartData, options: optionsBase }
    if (tipoGrafico === 'bar') {
      return <Bar ref={chartRef} {...commonProps} onClick={onBarClick} />
    }
    if (tipoGrafico === 'line') {
      return <Line ref={chartRef} {...commonProps} /* clic poco sensato su line */ />
    }
    if (tipoGrafico === 'pie') {
      return <Pie ref={chartRef} {...commonProps} /* clic su torta non abilitato per coerenza */ />
    }
    return null
  }

  return (
    <div>
      <Navbar />
      <div className="statistiche-container">
        <h2>Statistiche</h2>

        {categoriaTop.totale > 0 && (
          <div className="statistica-evidenza">
            <p>
              💡 Hai speso di più nella categoria <strong>{categoriaTop.nome}</strong> con un totale di <strong>{categoriaTop.totale.toFixed(2)} €</strong>.
            </p>
            <p className="suggerimento">
              {suggerimentoRisparmio(categoriaTop.nome)}
            </p>
          </div>
        )}

        <div className="filtri-container">
          <div>
            <label>Carta:</label>
            <select value={cartaSelezionata} onChange={e => setCartaSelezionata(e.target.value)}>
              <option value="">-- seleziona --</option>
              {carte.map(c => (
                <option key={c.id} value={c.id}>{c.titolare}</option>
              ))}
            </select>
          </div>

          <div>
            <label>Tipo:</label>
            <select value={tipoMovimento} onChange={e => setTipoMovimento(e.target.value)}>
              <option value="entrate">Entrate</option>
              <option value="uscite">Uscite</option>
            </select>
          </div>

          <div>
            <label>Da:</label>
            <input type="date" value={inizio} onChange={e => setInizio(e.target.value)} />
            <label>A:</label>
            <input type="date" value={fine} onChange={e => setFine(e.target.value)} />
          </div>

          <div>
            <label>Grafico:</label>
            <select value={tipoGrafico} onChange={e => setTipoGrafico(e.target.value)}>
              <option value="bar">Barre</option>
              <option value="pie">Torta</option>
              <option value="line">Linea</option>
            </select>
          </div>
        </div>

        <div className="categorie-checkbox">
          {categorie.map(c => (
            <label key={c.id}>
              <input
                type="checkbox"
                checked={categorieIncluse.includes(c.id)}
                onChange={e => {
                  if (e.target.checked) setCategorieIncluse(prev => [...prev, c.id])
                  else setCategorieIncluse(prev => prev.filter(id => id !== c.id))
                }}
              />
              {c.nome}
            </label>
          ))}
        </div>

        <div className="grafico-box">
          {getChart()}
        </div>

        {categoriaCliccata && (
          <div className="dettaglio-categoria">
            <div className="dettaglio-header">
              <h4>Dettaglio: {categoriaCliccata.nome}</h4>
              <button onClick={() => { setCategoriaCliccata(null); setListaTransazioni([]); setPaginaCat(1) }}
                  style={{marginTop: '10px' ,marginBottom:'10px'}}
                >
                Chiudi
              </button>
            </div>

            {loadingCat && <p>Caricamento...</p>}

            {!loadingCat && listaTransazioni.length === 0 && (
              <p>Nessuna transazione trovata per questa categoria nel periodo selezionato.</p>
            )}

            {!loadingCat && listaTransazioni.length > 0 && (
              <>
                {listaTransazioni.map(t => (
                  <div key={t.id} className={`transazione-item ${tipoMovimento === 'entrate' ? 'entrata' : 'uscita'}`}>
                    <strong>{t.titolo}</strong> — € {Number(t.importo).toFixed(2)}<br/>
                    <small>
                      Categoria: {t.Categorie?.nome || 'N/D'} — Carta: {t.Carta?.titolare || 'N/D'} — {new Date(t.data).toLocaleDateString()}
                    </small>
                  </div>
                ))}
                <button style={{ marginTop: '1rem' }} onClick={caricaAltriCat}>
                  Carica altri
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
