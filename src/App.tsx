import { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Button } from './components/ui/Button'
import { Input } from './components/ui/Input'
import { Select } from './components/ui/Select'
import { Badge } from './components/ui/Badge'
import { Avatar } from './components/ui/Avatar'
import { ProtectedRoute, PublicOnlyRoute } from './components/ui/Protectedroute'
import Loginpage from './pages/Loginpage'
import Registerpage from './pages/Registerpage'
import Resetpasswordpage from './pages/Resetpasswordpage'
import { Acceptinvitationpage } from './pages/Acceptinvitationpage'
import { Teampage } from './pages/Teampage'
import { Projectspage } from './pages/Projectspage'
import { Createprojectpage } from './pages/Createprojectpage'
import { Projectdetailpage } from './pages/Projectdetailpage'
import { Editprojectpage } from './pages/Editprojectpage'
import { Projectstatuspage } from './pages/Projectstatuspage' 


function DashboardPreview() {
  const [name, setName] = useState('')

  return (
    <main className="min-h-screen bg-surface text-ink p-6 sm:p-12">
      <h1 className="font-display text-3xl mb-1">TEKO — sistema visual</h1>
      <p className="label opacity-60 mb-10">Página de prueba /// Día 2</p>

      <div className="max-w-md flex flex-col gap-6">
        <div className="flex gap-3">
          <Button variant="primary">Guardar</Button>
          <Button variant="secondary">Cancelar</Button>
          <Button variant="accent">Crear</Button>
        </div>

        <Input
          label="Nombre del proyecto"
          placeholder="Ej. Rediseño landing"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <Select
          label="Responsable"
          placeholder="Selecciona un responsable"
          options={[
            { value: 'santiago', label: 'Santiago' },
            { value: 'carol', label: 'Carol' },
          ]}
        />

        <div className="flex items-center gap-3">
          <Badge variant="accent">Urgente</Badge>
          <Badge variant="outline">Backlog</Badge>
          <Avatar name={name || 'Santiago Gómez'} />
        </div>
      </div>
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Loginpage />
          </PublicOnlyRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicOnlyRoute>
            <Registerpage />
          </PublicOnlyRoute>
        }
      />
      <Route path="/reset-password" element={<Resetpasswordpage />} />
      <Route path="/invitaciones/aceptar" element={<Acceptinvitationpage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPreview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/equipo"
        element={
          <ProtectedRoute>
            <Teampage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/proyectos"
        element={
          <ProtectedRoute>
            <Projectspage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/proyectos/nuevo"
        element={
          <ProtectedRoute>
            <Createprojectpage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/proyectos/:id"
        element={
          <ProtectedRoute>
            <Projectdetailpage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/proyectos/:id/editar"
        element={
          <ProtectedRoute>
            <Editprojectpage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/proyectos/:id/estado"
        element={
          <ProtectedRoute>
            <Projectstatuspage />
          </ProtectedRoute>
        }
      />

    </Routes>
  )
}

export default App