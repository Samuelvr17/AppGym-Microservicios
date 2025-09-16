import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './hooks/useAuth'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import RoutinesPage from './pages/RoutinesPage'
import WorkoutsPage from './pages/WorkoutsPage'
import AdminPage from './pages/AdminPage'
import RoutineFormPage from './pages/RoutineFormPage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            } />
            <Route path="/routines" element={
              <ProtectedRoute>
                <RoutinesPage />
              </ProtectedRoute>
            } />
            <Route path="/routines/new" element={
              <ProtectedRoute>
                <RoutineFormPage />
              </ProtectedRoute>
            } />
            <Route path="/routines/:id" element={
              <ProtectedRoute>
                <RoutineFormPage />
              </ProtectedRoute>
            } />
            <Route path="/workouts" element={
              <ProtectedRoute>
                <WorkoutsPage />
              </ProtectedRoute>
            } />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  )
}

export default App