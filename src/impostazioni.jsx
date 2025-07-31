import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import Navbar from './Navbar'

export default function Impostazioni() {
  const [utente, setUtente] = useState(null)
  const [admin, setAdmin] = useState(false)
  const [immagine, setImmagine] = useState(null)
  const [nuovaPassword, setNuovaPassword] = useState('')
  const [listaUtenti, setListaUtenti] = useState([])
  const [formNuovoUtente, setFormNuovoUtente] = useState({
    nome: '', cognome: '', nomeUtente: '', email: '', password: ''
  })

  useEffect(() => {
    const fetchUtente = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: dbUtente } = await supabase
        .from('Utente')
        .select('*')
        .eq('idUUID', user.id)
        .single()

      setUtente(dbUtente)
      setAdmin(dbUtente?.admin || false)

      if (dbUtente?.admin) {
        const { data: utenti } = await supabase.from('Utente').select('*')
        setListaUtenti(utenti)
      }
    }

    fetchUtente()
  }, [])

  const cambiaImmagine = async () => {
    if (!immagine || !utente) return

    const ext = immagine.name.split('.').pop()
    const fileName = `${utente.idUUID}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, immagine, { upsert: true })

    if (uploadError) {
      console.error("Errore upload:", uploadError)
      return alert('Errore upload immagine')
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
    const publicUrl = data.publicUrl

    const { error: updateError } = await supabase
      .from('Utente')
      .update({ urlPic: publicUrl })
      .eq('id', utente.id)

    if (!updateError) {
      alert('✅ Immagine aggiornata!')
      setUtente(prev => ({ ...prev, urlPic: publicUrl }))
      window.location.reload() // 🔁 opzionale se vuoi ricaricare tutto
    }
  }

  const cambiaPassword = async () => {
    if (nuovaPassword.length < 6) return alert("Minimo 6 caratteri!")
    const { error } = await supabase.auth.updateUser({ password: nuovaPassword })
    if (!error) alert("✅ Password cambiata!")
  }

  const creaNuovoUtente = async () => {
    const { email, password, nome, cognome, nomeUtente } = formNuovoUtente

    const { data: nuovoAuth, error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true
    })

    if (error) return alert("Errore creazione utente: " + error.message)

    await supabase.from('Utente').insert({
      nome, cognome, nomeUtente, idUUID: nuovoAuth.user.id, admin: false
    })

    alert("✅ Utente creato con successo!")
  }

  const eliminaUtente = async (utenteDaEliminare) => {
    const conferma = confirm(`Vuoi davvero eliminare ${utenteDaEliminare.nome}?`)
    if (!conferma) return

    await supabase.auth.admin.deleteUser(utenteDaEliminare.idUUID)
    await supabase.from('Utente').delete().eq('id', utenteDaEliminare.id)

    setListaUtenti(prev => prev.filter(u => u.id !== utenteDaEliminare.id))
    alert("✅ Utente eliminato!")
  }

  return (
    <div style={{ padding: '2rem' }}>
      <Navbar />
      <h2>⚙️ Impostazioni</h2>

      <h3>Cambia immagine profilo</h3>
      <input type="file" onChange={e => setImmagine(e.target.files[0])} />
      {immagine && (
        <img
          src={URL.createObjectURL(immagine)}
          alt="Anteprima"
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            objectFit: 'cover',
            marginTop: '1rem',
            border: '2px solid #ccc'
          }}
        />
      )}
      <br />
      <button onClick={cambiaImmagine} style={{ marginTop: '1rem' }}>📸 Carica</button>

      <h3>Cambia password</h3>
      <input
        type="password"
        placeholder="Nuova password"
        value={nuovaPassword}
        onChange={e => setNuovaPassword(e.target.value)}
      />
      <button onClick={cambiaPassword}>🔐 Cambia</button>

      {admin && (
        <>
          <h3>📋 Tutti gli utenti</h3>
          <ul>
            {listaUtenti.map(u => (
              <li key={u.id}>
                {u.nome} {u.cognome} ({u.nomeUtente})
                <button onClick={() => eliminaUtente(u)} style={{ marginLeft: '1rem', color: 'red' }}>❌ Elimina</button>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
