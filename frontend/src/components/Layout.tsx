import React, { useState } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { LogOut, Menu, User, X } from 'lucide-react'

interface LayoutProps {
  children: React.ReactNode
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
    setIsMobileMenuOpen(false)
  }

  const navigationLinks = (
    <>
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
          }`
        }
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/routines"
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
          }`
        }
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Rutinas
      </NavLink>
      <NavLink
        to="/workouts"
        className={({ isActive }) =>
          `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
            isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
          }`
        }
        onClick={() => setIsMobileMenuOpen(false)}
      >
        Entrenamientos
      </NavLink>
      {user?.role === 'admin' && (
        <NavLink
          to="/admin"
          className={({ isActive }) =>
            `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
              isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
            }`
          }
          onClick={() => setIsMobileMenuOpen(false)}
        >
          Admin
        </NavLink>
      )}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to={isAuthenticated ? '/dashboard' : '/'}
                className="text-lg sm:text-xl font-bold text-primary-600 hover:text-primary-700 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                💪 Fitness App
              </Link>
            </div>

            <div className="flex items-center gap-3">
              {isAuthenticated && (
                <button
                  type="button"
                  className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 md:hidden"
                  onClick={() => setIsMobileMenuOpen((prev) => !prev)}
                  aria-expanded={isMobileMenuOpen}
                  aria-controls="mobile-navigation"
                  aria-label={isMobileMenuOpen ? 'Cerrar menú principal' : 'Abrir menú principal'}
                >
                  {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
              )}

              <nav className="hidden md:flex items-center space-x-2">
                {isAuthenticated ? (
                  <>
                    {navigationLinks}
                    <div className="flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                      <User className="h-4 w-4 text-gray-500" />
                      <span className="text-sm text-gray-700">{user?.username}</span>
                      <button
                        onClick={handleLogout}
                        className="inline-flex items-center justify-center rounded-lg p-2 text-gray-500 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                        title="Cerrar sesión"
                        type="button"
                      >
                        <LogOut className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <NavLink
                      to="/"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
                        }`
                      }
                    >
                      Inicio
                    </NavLink>
                    <NavLink
                      to="/login"
                      className={({ isActive }) =>
                        `px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                          isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-600 hover:text-primary-600 hover:bg-primary-50'
                        }`
                      }
                    >
                      Iniciar Sesión
                    </NavLink>
                    <Link to="/register" className="btn-primary text-sm">
                      Registrarse
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>

        {isAuthenticated && (
          <div
            id="mobile-navigation"
            className={`${
              isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
            } md:hidden overflow-hidden transition-[max-height,opacity] duration-300 ease-out bg-white border-t border-gray-200`}
          >
            <div className="px-4 py-3 space-y-3">
              {navigationLinks}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3 bg-gray-50">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">{user?.username}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
                  type="button"
                >
                  <LogOut className="h-4 w-4 mr-1" />
                  Salir
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="w-full flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>

      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto py-5 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            © 2025 Fitness App. Gestión de rutinas de entrenamiento.
          </p>
        </div>
      </footer>
    </div>
  )
}

export default Layout