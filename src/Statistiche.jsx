import { useEffect, useState } from 'react'
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
import { Bar, Pie, Line } from 'react-chartjs-2'
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
      setCarte(carteDb)
      setCategorie(cat)
      setCategorieIncluse(cat.map(c => c.id))
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
    }

    fetchMovimenti()
  }, [idUtente, cartaSelezionata, tipoMovimento])

  const datiFiltrati = dati.filter(d => {
    const data = new Date(d.data)
    const inizioOk = !inizio || new Date(inizio) <= data
    const fineOk = !fine || new Date(fine) >= data
    const catOk = categorieIncluse.includes(d.idCategoria)
    return inizioOk && fineOk && catOk
  })

  const datiPerCategoria = categorie.map(c => {
    const totale = datiFiltrati
      .filter(d => d.idCategoria === c.id)
      .reduce((acc, cur) => acc + parseFloat(cur.importo), 0)
    return { nome: c.nome, totale, colore: c.coloreHex }
  }).filter(d => d.totale > 0)

  const categoriaTop = datiPerCategoria.reduce((max, cur) => cur.totale > max.totale ? cur : max, { nome: '', totale: 0 })

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

  const options = {
    plugins: {
      datalabels: {
        anchor: 'center',
        align: 'center',
        color: '#fff',
        font: {
          weight: 'bold'
        },
        formatter: v => v.toFixed(2) + ' €'
      }
    }
  }

  const getChart = () => {
    const chartData = {
      labels: datiPerCategoria.map(d => d.nome),
      datasets: [{
        label: tipoMovimento === 'entrate' ? 'Entrate' : 'Uscite',
        data: datiPerCategoria.map(d => d.totale),
        backgroundColor: datiPerCategoria.map(d => d.colore)
      }]
    }

    switch (tipoGrafico) {
      case 'bar': return <Bar data={chartData} options={options} />
      case 'line': return <Line data={chartData} options={options} />
      case 'pie': return <Pie data={chartData} options={options} />
      default: return null
    }
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
                  if (e.target.checked)
                    setCategorieIncluse(prev => [...prev, c.id])
                  else
                    setCategorieIncluse(prev => prev.filter(id => id !== c.id))
                }}
              />
              {c.nome}
            </label>
          ))}
        </div>

        <div className="grafico-box">
          {getChart()}
        </div>
      </div>
    </div>
  )
}
