import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'
import { Bar, Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title
} from 'chart.js'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import './Statistiche.css'

ChartJS.register(
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  ChartDataLabels
)

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [conti, setConti] = useState([])
  const [totale, setTotale] = useState(0)
  const [storico, setStorico] = useState([])
  const [movimenti, setMovimenti] = useState([])
  const [cartaSelezionata, setCartaSelezionata] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) navigate('/login')
      else setUser(data.user)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    const fetchConti = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: utente } = await supabase
        .from('Utente')
        .select('id')
        .eq('idUUID', user.id)
        .single()

      const { data: carte } = await supabase
        .from('Carta')
        .select('*')
        .eq('idUtente', utente.id)

      setConti(carte)
      if (carte.length > 0) setCartaSelezionata(carte[0].id)

      const { data: entrate } = await supabase
        .from('Entrate')
        .select('*')
        .eq('idUtente', utente.id)
        .order('data', { ascending: false })
        .limit(5)

      const { data: uscite } = await supabase
        .from('Uscite')
        .select('*')
        .eq('idUtente', utente.id)
        .order('data', { ascending: false })
        .limit(5)

      setMovimenti([...(entrate || []), ...(uscite || [])].sort((a, b) => new Date(b.data) - new Date(a.data)))

      const somma = carte.reduce((acc, curr) => acc + parseFloat(curr.totale), 0)
      setTotale(somma)
    }

    fetchConti()
  }, [])

  useEffect(() => {
    const fetchStorico = async () => {
      if (!cartaSelezionata) return
      const { data: storicoData } = await supabase
        .from('StoricoInvestimenti')
        .select('*')
        .eq('idCarta', cartaSelezionata)
        .order('data', { ascending: true })
      setStorico(storicoData || [])
    }
    fetchStorico()
  }, [cartaSelezionata])

  const barData = {
    labels: conti.map(c => c.titolare),
    datasets: [
      {
        label: 'Saldo in Euro',
        data: conti.map(c => c.totale),
        backgroundColor: '#66ffd9'
      }
    ]
  }

  const lineData = {
    labels: storico.map(s => new Date(s.data).toLocaleDateString()),
    datasets: [
      {
        label: 'Saldo carta selezionata',
        data: storico.map(s => s.valore),
        borderColor: '#7a6fff',
        backgroundColor: 'rgba(122,111,255,0.3)',
        tension: 0.3,
        fill: true
      }
    ]
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
      },
      legend: {
        labels: {
          color: '#eaeaea'
        }
      },
      title: {
        display: true,
        text: 'Saldo attuale per conto',
        color: '#66ffd9',
        font: {
          size: 18
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: '#eaeaea'
        }
      },
      y: {
        ticks: {
          color: '#eaeaea'
        }
      }
    }
  }

  return (
    <div>
      <Navbar />
      <div className="statistiche-container">
        <h2>Dashboard Finanziaria</h2>

        <div className="statistica-evidenza">
          <p><strong>Patrimonio totale:</strong> {totale.toFixed(2)} €</p>
          <p className="suggerimento">
            Panoramica aggiornata delle finanze attuali, basata sui conti attivi.
          </p>
        </div>

        <div className="statistica-evidenza">
          <p><strong>Conti attivi:</strong> {conti.length}</p>
          <p className="suggerimento">
            Tieni monitorati saldo e numero dei tuoi conti per un controllo ottimale del tuo patrimonio.
          </p>
        </div>

        <div className="grafico-box">
          <h4>Visualizzazione Saldi per Conto</h4>
          <Bar data={barData} options={options} />
        </div>

        
        <div className="statistica-evidenza">
          <p><strong>Lista dei conti e ultimi aggiornamenti</strong></p>
          <div style={{ marginTop: '1rem' }}>
            {conti.map(c => (
              <div key={c.id} style={{ marginBottom: '0.6rem' }}>
                <span style={{ fontWeight: 'bold', color: '#66ffd9' }}>{c.titolare}</span> – Saldo: {parseFloat(c.totale).toFixed(2)} €
              </div>
            ))}
          </div>
        </div>

        <div className="statistica-evidenza">
          <p><strong>Ultimi movimenti registrati</strong></p>
          <div style={{ marginTop: '1rem' }}>
            {movimenti.slice(0, 5).map((m, idx) => (
              <div key={idx} style={{ marginBottom: '0.6rem' }}>
                {new Date(m.data).toLocaleDateString()} – {m.titolo || 'Movimento'} – {parseFloat(m.importo).toFixed(2)} €
              </div>
            ))}
          </div>
        </div>

        <div className="statistica-evidenza">
          <p><strong>Consigli per una gestione efficace</strong></p>
          <p className="suggerimento">
            Per una gestione ottimale delle tue finanze considera queste buone pratiche:
          </p>
          <div style={{ marginTop: '1rem' }}>
            <div>– Verifica e aggiorna frequentemente i saldi</div>
            <div>– Ottimizza le spese ricorrenti</div>
            <div>– Categorizza le transazioni per maggiore chiarezza</div>
            <div>– Usa i moduli statistici per individuare le aree critiche</div>
          </div>
        </div>
      </div>
    </div>
  )
}
