import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { workoutService } from '../services/workoutService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { Search, Calendar, Clock, TrendingUp, Eye, Trash2 } from 'lucide-react'

type WorkoutSet = { exerciseName: string }
type Workout = {
  id: number
  routineName: string
  completedAt?: string | null
  startedAt: string
  duration?: number
  notes?: string
  sets?: WorkoutSet[]
}

type Pagination = {
  page: number
  limit: number
  total: number
  pages: number
}

type DateFilter = {
  startDate: string
  endDate: string
}

type GetWorkoutsResponse = {
  workouts: Workout[]
  pagination: Pagination
}

const WorkoutsPage: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState<DateFilter>({
    startDate: '',
    endDate: ''
  })
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  })

  useEffect(() => {
    loadWorkouts()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.page, searchQuery, dateFilter])

  const loadWorkouts = async () => {
    try {
      setIsLoading(true)
      const data = (await workoutService.getWorkouts({
        q: searchQuery || undefined,
        page: pagination.page,
        limit: pagination.limit,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined
      })) as GetWorkoutsResponse

      setWorkouts(data.workouts)
      setPagination(prev => ({ ...prev, ...data.pagination }))
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar los entrenamientos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    // Solo cambiamos de página para que el useEffect dispare la carga (evita doble fetch)
    setPagination(prev => ({ ...prev, page: 1 }))
  }

  const handleDelete = async (id: number, routineName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el entrenamiento "${routineName}"?`)) return
    try {
      await workoutService.deleteWorkout(id)
      await loadWorkouts()
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Error al eliminar el entrenamiento')
    }
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-0">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Mis entrenamientos</h1>
            <p className="text-sm text-gray-600 sm:text-base">
              Consulta tu historial y filtra por fecha o nombre para encontrar sesiones específicas.
            </p>
          </div>

          <section className="card-surface p-5 sm:p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar entrenamientos..."
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    className="input-field pl-11"
                  />
                </div>
                <button type="submit" className="btn-primary sm:w-40 flex items-center justify-center gap-2">
                  Buscar
                </button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Fecha desde
                  <input
                    type="date"
                    value={dateFilter.startDate}
                    onChange={(event) => setDateFilter((prev) => ({ ...prev, startDate: event.target.value }))}
                    className="input-field"
                  />
                </label>
                <label className="space-y-2 text-sm font-medium text-gray-700">
                  Fecha hasta
                  <input
                    type="date"
                    value={dateFilter.endDate}
                    onChange={(event) => setDateFilter((prev) => ({ ...prev, endDate: event.target.value }))}
                    className="input-field"
                  />
                </label>
              </div>
            </form>
          </section>
        </header>

        {error && <ErrorMessage message={error} onRetry={loadWorkouts} />}

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : workouts.length > 0 ? (
          <>
            <div className="space-y-4">
              {workouts.map((workout) => {
                const uniqueExercises = Array.from(
                  new Set((workout.sets ?? []).map((set) => set?.exerciseName).filter(Boolean) as string[])
                )

                return (
                  <article key={workout.id} className="card-surface p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-lg font-semibold text-gray-900">{workout.routineName}</h3>
                          <span
                            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                              workout.completedAt
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                            }`}
                          >
                            {workout.completedAt ? 'Completado' : 'En progreso'}
                          </span>
                        </div>

                        <div className="grid gap-3 text-sm text-gray-600 sm:grid-cols-3">
                          <div className="inline-flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary-500" />
                            {new Date(workout.startedAt).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <Clock className="h-4 w-4 text-primary-500" />
                            {formatDuration(workout.duration)}
                          </div>
                          <div className="inline-flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-primary-500" />
                            {workout.sets?.length || 0} series registradas
                          </div>
                        </div>

                        {workout.notes && (
                          <p className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-700">{workout.notes}</p>
                        )}

                        {uniqueExercises.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {uniqueExercises.map((exerciseName) => (
                              <span
                                key={exerciseName}
                                className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-800"
                              >
                                {exerciseName}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2 sm:w-40">
                        <Link
                          to={`/workouts/${workout.id}`}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <Eye className="h-4 w-4" />
                          Ver detalle
                        </Link>
                        <button
                          type="button"
                          onClick={() => handleDelete(workout.id, workout.routineName)}
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                )
              })}
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
            <div className="text-6xl mb-4">📊</div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {searchQuery || dateFilter.startDate || dateFilter.endDate
                ? 'No se encontraron entrenamientos'
                : 'No tienes entrenamientos registrados'}
            </h3>
            <p className="text-gray-500 mb-4">
              {searchQuery || dateFilter.startDate || dateFilter.endDate
                ? 'Intenta con otros filtros de búsqueda'
                : 'Inicia tu primer entrenamiento para ver el historial aquí'}
            </p>
            {!searchQuery && !dateFilter.startDate && !dateFilter.endDate && (
              <Link to="/routines" className="btn-primary">
                Elegir rutina para entrenar
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkoutsPage
