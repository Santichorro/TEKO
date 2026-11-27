import { Routes, Route, Navigate } from 'react-router-dom'
import { ProtectedRoute, PublicOnlyRoute } from './components/ui/Protectedroute'
import { Applayout } from './layouts/Applayout'
import Loginpage from './pages/Loginpage'
import Registerpage from './pages/Registerpage'
import Resetpasswordpage from './pages/Resetpasswordpage'
import { Acceptinvitationpage } from './pages/Acceptinvitationpage'
import { Dashboardpage } from './pages/Dashboardpage'
import { Teampage } from './pages/Teampage'
import { Projectspage } from './pages/Projectspage'
import { Createprojectpage } from './pages/Createprojectpage'
import { Projectdetailpage } from './pages/Projectdetailpage'
import { Editprojectpage } from './pages/Editprojectpage'
import { Projectstatuspage } from './pages/Projectstatuspage'
import { Createtaskpage } from './pages/Createtaskpage'
import { Taskdetailpage } from './pages/Taskdetailpage'
import { Taskspage } from './pages/Taskspage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Públicas */}
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

      {/* Protegidas: todas comparten sidebar + topbar */}
      <Route
        element={
          <ProtectedRoute>
            <Applayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboardpage />} />
        <Route path="/tareas" element={<Taskspage />} />
        <Route path="/equipo" element={<Teampage />} />
        <Route path="/proyectos" element={<Projectspage />} />
        <Route path="/proyectos/nuevo" element={<Createprojectpage />} />
        <Route path="/proyectos/:id" element={<Projectdetailpage />} />
        <Route path="/proyectos/:id/editar" element={<Editprojectpage />} />
        <Route path="/proyectos/:id/estado" element={<Projectstatuspage />} />
        <Route path="/proyectos/:id/tareas/nueva" element={<Createtaskpage />} />
        <Route path="/proyectos/:id/tareas/:taskId" element={<Taskdetailpage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
