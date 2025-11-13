import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { workoutService } from '../services/workoutService'
import type { Workout, WorkoutSet } from '../types'

const formatDateTime = (value?: string) => {
  if (!value) return 'No registrado'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Fecha inválida'
  return date.toLocaleString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatDuration = (seconds?: number) => {
  if (seconds === undefined || seconds === null || seconds < 0) return '—'
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}h ${minutes}m`
  }

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`
  }

  return `${remainingSeconds}s`
}

const WorkoutDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  const workoutId = useMemo(() => {
    if (!id) return NaN
    const numericId = Number(id)
    return Number.isFinite(numericId) ? numericId : NaN
  }, [id])

  const loadWorkout = useCallback(async () => {
    if (!Number.isFinite(workoutId)) {
      setError('Entrenamiento no encontrado')
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      const data = await workoutService.getWorkout(workoutId)
      setWorkout(data)
      setError('')
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Error al cargar el entrenamiento')
    } finally {
      setIsLoading(false)
    }
  }, [workoutId])

  useEffect(() => {
    loadWorkout()
  }, [loadWorkout])

  const durationInSeconds = useMemo(() => {
    if (!workout) return undefined
    if (typeof workout.duration === 'number') return workout.duration
    if (workout.completedAt) {
      const start = new Date(workout.startedAt).getTime()
      const end = new Date(workout.completedAt).getTime()
      if (!Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
        return Math.round((end - start) / 1000)
      }
    }
    return undefined
  }, [workout])

  const setsByExercise = useMemo(() => {
    if (!workout?.sets) return []
    const grouped = new Map<number, { exerciseName: string; sets: WorkoutSet[] }>()

    workout.sets.forEach((set) => {
      const entry = grouped.get(set.exerciseId)
      if (entry) {
        entry.sets.push(set)
      } else {
        grouped.set(set.exerciseId, {
          exerciseName: set.exerciseName,
          sets: [set]
        })
      }
    })

    return Array.from(grouped.values()).map(({ exerciseName, sets }) => ({
      exerciseName,
      sets: [...sets].sort((a, b) => a.setNumber - b.setNumber)
    }))
  }, [workout?.sets])

  return (
    <div className="py-6 sm:py-10">
      <div className="mx-auto max-w-3xl space-y-6 px-4 sm:px-0">
        <Link
          to="/workouts"
          className="inline-flex items-center gap-2 text-sm font-medium text-gray-500 transition hover:text-gray-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver al historial
        </Link>

        {error && !isLoading && (
          <ErrorMessage message={error} onRetry={Number.isFinite(workoutId) ? loadWorkout : undefined} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : workout ? (
          <div className="space-y-6">
            <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
              <p className="text-sm font-medium uppercase tracking-wide text-gray-500">Rutina</p>
              <h1 className="mt-1 text-2xl font-semibold text-gray-900 sm:text-3xl">{workout.routineName}</h1>

              <dl className="mt-6 space-y-3 text-sm text-gray-600">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="font-medium text-gray-900">Fecha exacta y hora</dt>
                  <dd>{formatDateTime(workout.startedAt)}</dd>
                </div>
                {workout.completedAt && (
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <dt className="font-medium text-gray-900">Finalizó</dt>
                    <dd>{formatDateTime(workout.completedAt)}</dd>
                  </div>
                )}
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="font-medium text-gray-900">Duración del entrenamiento</dt>
                  <dd>{formatDuration(durationInSeconds)}</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                  <dt className="font-medium text-gray-900">Series registradas</dt>
                  <dd>{workout.sets?.length ?? 0}</dd>
                </div>
              </dl>

              {workout.notes && (
                <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm text-gray-600">
                  <p className="font-medium text-gray-900">Notas del entrenamiento</p>
                  <p className="mt-1 whitespace-pre-line">{workout.notes}</p>
                </div>
              )}
            </section>

            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Detalle de ejercicios</h2>

              {setsByExercise.length === 0 ? (
                <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
                  No se registraron series para este entrenamiento.
                </div>
              ) : (
                <div className="space-y-4">
                  {setsByExercise.map(({ exerciseName, sets }) => (
                    <article
                      key={exerciseName}
                      className="rounded-3xl border border-gray-200 bg-white p-5 shadow-sm"
                    >
                      <header className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="text-lg font-semibold text-gray-900">{exerciseName}</h3>
                        <span className="text-sm text-gray-500">
                          {sets.length} {sets.length === 1 ? 'serie registrada' : 'series registradas'}
                        </span>
                      </header>

                      <div className="mt-4 overflow-x-auto">
                        <table className="w-full table-fixed border-collapse text-left text-sm text-gray-600">
                          <thead>
                            <tr className="text-xs uppercase tracking-wide text-gray-400">
                              <th className="w-24 pb-2 pr-4 font-medium text-gray-500">Serie</th>
                              <th className="w-28 pb-2 pr-4 font-medium text-gray-500">Peso</th>
                              <th className="w-24 pb-2 font-medium text-gray-500">Reps</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {sets.map((set) => (
                              <tr key={set.id} className="align-top">
                                <td className="py-3 pr-4 text-gray-900">#{set.setNumber}</td>
                                <td className="py-3 pr-4 text-gray-900">
                                  {set.weight !== undefined && set.weight !== null ? `${set.weight} kg` : '—'}
                                </td>
                                <td className="py-3 text-gray-900">{set.reps}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        ) : !error ? (
          <div className="rounded-3xl border border-gray-200 bg-white p-6 text-center text-sm text-gray-500 shadow-sm">
            No se encontró la información del entrenamiento solicitado.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default WorkoutDetailPage