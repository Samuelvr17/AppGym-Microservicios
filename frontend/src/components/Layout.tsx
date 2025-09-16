import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, User } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to={isAuthenticated ? "/dashboard" : "/"} className="text-xl font-bold text-primary-600 hover:text-primary-700">
                💪 Fitness App
              </Link>
            </div>
            <nav className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link to="/dashboard" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                    Dashboard
                  </Link>
                  <Link to="/routines" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                    Rutinas
                  </Link>
                  <Link to="/workouts" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                    Entrenamientos
                  </Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                      Admin
                    </Link>
                  )}
                  <div className="flex items-center space-x-2 ml-4 pl-4 border-l border-gray-200">
                    <User className="h-4 w-4 text-gray-500" />
                    <span className="text-sm text-gray-700">{user?.username}</span>
                    <button
                      onClick={handleLogout}
                      className="text-gray-500 hover:text-red-600 p-1"
                      title="Cerrar sesión"
                    >
                      <LogOut className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <Link to="/" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                    Inicio
                  </Link>
                  <Link to="/login" className="text-gray-600 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium">
                    Iniciar Sesión
                  </Link>
                  <Link to="/register" className="btn-primary text-sm">
                    Registrarse
                  </Link>
                </>
              )}
            </nav>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {children}
      </main>
      
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2025 Fitness App. Gestión de rutinas de entrenamiento.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout