import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { workoutService } from '../services/workoutService'

type WorkoutSet = { exerciseName: string }

type Workout = {
  id: number
  routineName: string
  startedAt: string
  duration?: number
  sets?: WorkoutSet[]
}

type GetWorkoutsResponse = {
  workouts: Workout[]
  pagination?: {
    total: number
  }
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (hours > 0) {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m`
  }

  return `${minutes}m`
}

const formatDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha inválida'
  return date.toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

const formatTime = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit'
  })
}

const WorkoutsPage: React.FC = () => {
  const [workouts, setWorkouts] = useState<Workout[]>([])
  const [totalWorkouts, setTotalWorkouts] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const loadWorkouts = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = (await workoutService.getWorkouts({ page: 1, limit: 50 })) as GetWorkoutsResponse
      setWorkouts(data.workouts)
      setTotalWorkouts(data.pagination?.total ?? data.workouts.length)
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar los entrenamientos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadWorkouts()
  }, [loadWorkouts])

  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-0">
        <header className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Historial de entrenamientos</h1>
          <p className="text-sm text-gray-500 sm:text-base">
            {totalWorkouts} {totalWorkouts === 1 ? 'entrenamiento registrado' : 'entrenamientos registrados'}
          </p>
        </header>

        {error && <ErrorMessage message={error} onRetry={loadWorkouts} />}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : workouts.length > 0 ? (
          <div className="space-y-4">
            {workouts.map((workout) => {
              const uniqueExercises = Array.from(
                new Set((workout.sets ?? []).map((set) => set?.exerciseName).filter(Boolean) as string[])
              )

              return (
                <Link
                  to={`/workouts/${workout.id}`}
                  key={workout.id}
                  className="block rounded-3xl border border-gray-200 bg-white p-5 shadow-sm transition hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                      <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">{workout.routineName}</h2>
                      <time className="text-sm text-gray-500">{formatDate(workout.startedAt)}</time>
                    </div>

                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-gray-900">{uniqueExercises.length}</span>
                        <span>ejercicios</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-gray-900">{formatDuration(workout.duration)}</span>
                        <span>duración</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className="font-semibold text-gray-900">{formatTime(workout.startedAt)}</span>
                        <span>hora de inicio</span>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-gray-300 bg-white p-10 text-center shadow-sm">
            <div className="mb-4 text-5xl">📚</div>
            <h3 className="mb-2 text-lg font-semibold text-gray-900">No tienes entrenamientos registrados</h3>
            <p className="text-sm text-gray-500">
              Inicia tu primer entrenamiento para ver el historial aquí.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default WorkoutsPage
