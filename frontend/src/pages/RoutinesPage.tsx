import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { routineService } from '../services/routineService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { Plus, Search, Edit, Trash2, Copy, Play } from 'lucide-react'

const RoutinesPage: React.FC = () => {
  const [routines, setRoutines] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    loadRoutines()
  }, [pagination.page, searchQuery])

  const loadRoutines = async () => {
    try {
      setIsLoading(true)
      const data = await routineService.getRoutines({
        q: searchQuery || undefined,
        page: pagination.page,
        limit: pagination.limit
      })
      setRoutines(data.routines)
      setPagination(prev => ({ ...prev, ...data.pagination }))
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cargar las rutinas')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPagination(prev => ({ ...prev, page: 1 }))
    loadRoutines()
  }

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar la rutina "${name}"?`)) {
      return
    }

    try {
      await routineService.deleteRoutine(id)
      loadRoutines()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al eliminar la rutina')
    }
  }

  const handleDuplicate = async (id: number, originalName: string) => {
    const newName = prompt(`Nombre para la copia de "${originalName}":`, `${originalName} (Copia)`)
    if (!newName) return

    try {
      await routineService.duplicateRoutine(id, newName)
      loadRoutines()
    } catch (err: any) {
      alert(err.response?.data?.message || 'Error al duplicar la rutina')
    }
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
        <header className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis rutinas</h1>
              <p className="text-sm text-gray-600 sm:text-base">
                Organiza tus rutinas guardadas y crea nuevas combinaciones de ejercicios.
              </p>
            </div>
            <Link to="/routines/new" className="btn-primary flex items-center justify-center gap-2 sm:w-auto">
              <Plus className="h-4 w-4" />
              Nueva rutina
            </Link>
          </div>

          <form onSubmit={handleSearch} className="card-surface p-5 sm:p-6 space-y-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Buscar rutinas..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="input-field pl-11"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button type="submit" className="btn-primary sm:w-40 flex items-center justify-center gap-2">
                Buscar
              </button>
            </div>
          </form>
        </header>

        {error && <ErrorMessage message={error} onRetry={loadRoutines} />}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : routines.length > 0 ? (
          <>
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {routines.map((routine) => (
                <article key={routine.id} className="card-surface p-5 sm:p-6 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">{routine.name}</h3>
                      {routine.description && (
                        <p className="text-sm text-gray-600 line-clamp-3">{routine.description}</p>
                      )}
                    </div>
                    <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
                      <p className="font-medium text-gray-700">
                        {routine.exercises?.length || 0} ejercicios planificados
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Creada el {new Date(routine.createdAt).toLocaleDateString('es-ES')}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <Link
                      to={`/workout/start/${routine.id}`}
                      className="btn-primary flex items-center justify-center gap-2 sm:w-auto"
                    >
                      <Play className="h-4 w-4" />
                      Iniciar entrenamiento
                    </Link>
                    <div className="flex flex-wrap gap-2">
                      <Link
                        to={`/routines/${routine.id}`}
                        className="btn-secondary flex items-center justify-center gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Link>
                      <button
                        type="button"
                        onClick={() => handleDuplicate(routine.id, routine.name)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary-200 px-4 py-3 text-sm font-medium text-primary-600 hover:bg-primary-50"
                      >
                        <Copy className="h-4 w-4" />
                        Duplicar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(routine.id, routine.name)}
                        className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {pagination.pages > 1 && (
              <div className="flex justify-center pt-4">
                <div className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2 shadow-sm">
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    className="btn-secondary w-full sm:w-auto px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Anterior
                  </button>
                  <span className="text-sm text-gray-600">
                    Página {pagination.page} de {pagination.pages}
                  </span>
                  <button
                    onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.pages}
                    className="btn-secondary w-full sm:w-auto px-3 py-2 text-sm disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="card-surface p-10 text-center">
            <div className="text-6xl mb-4">🏋️‍♂️</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery ? 'No se encontraron rutinas' : 'No tienes rutinas creadas'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery
                ? 'Intenta con otros términos de búsqueda'
                : 'Crea tu primera rutina para comenzar a entrenar'}
            </p>
            {!searchQuery && (
              <Link to="/routines/new" className="btn-primary">
                Crear mi primera rutina
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default RoutinesPage