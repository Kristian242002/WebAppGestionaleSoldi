import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './Login'
import Dashboard from './dashboard'
import Conti from './Conti'
import Spese from './Spese'
function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/conti" element={<Conti />} />
        <Route path="/spese" element={<Spese />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
