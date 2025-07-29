import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const checkAuth = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) navigate('/login')
      else setUser(data.user)
    }
    checkAuth()
  }, [])

  return (
    <>
        <Navbar></Navbar>
      <div style={{ padding: '2rem' }}>
        <h2>Benvenuto nella Dashboard</h2>
        {user && <p>Email: {user.email}</p>}
      </div>
    </>
  )
}
