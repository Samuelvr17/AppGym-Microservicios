import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  Clock,
  ClipboardList,
  Dumbbell,
  Timer,
  FileText
} from 'lucide-react'
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
  if (seconds === undefined || seconds === null || seconds < 0) return 'N/A'
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

const calculateVolume = (set: WorkoutSet) => {
  if (set.weight === undefined || set.weight === null) return 0
  return set.weight * set.reps
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

  const totalSets = workout?.sets?.length ?? 0
  const totalVolume = useMemo(() => {
    if (!workout?.sets) return 0
    return workout.sets.reduce((acc, current) => acc + calculateVolume(current), 0)
  }, [workout?.sets])

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
    <div className="px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/workouts" className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al historial
          </Link>
          {workout && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                workout.completedAt
                  ? 'bg-green-100 text-green-800'
                  : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {workout.completedAt ? 'Completado' : 'En progreso'}
            </span>
          )}
        </div>

        {error && !isLoading && (
          <ErrorMessage message={error} onRetry={Number.isFinite(workoutId) ? loadWorkout : undefined} />
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : workout ? (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
                <div>
                  <p className="text-sm uppercase tracking-wider text-gray-500">Rutina</p>
                  <h1 className="text-3xl font-bold text-gray-900">{workout.routineName}</h1>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span>{formatDateTime(workout.startedAt)}</span>
                  </div>
                  {workout.completedAt && (
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      <span>Finalizado: {formatDateTime(workout.completedAt)}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <Timer className="h-4 w-4 mr-2" />
                    Duración total
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{formatDuration(durationInSeconds)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <ClipboardList className="h-4 w-4 mr-2" />
                    Series registradas
                  </div>
                  <p className="text-xl font-semibold text-gray-900">{totalSets}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center text-gray-500 text-sm mb-1">
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Volumen total
                  </div>
                  <p className="text-xl font-semibold text-gray-900">
                    {totalVolume > 0 ? `${totalVolume.toLocaleString('es-ES')} kg·rep` : '—'}
                  </p>
                </div>
              </div>

              {workout.notes && (
                <div className="mt-6 bg-gray-50 rounded-lg p-4 flex items-start">
                  <FileText className="h-5 w-5 text-gray-400 mr-3 mt-0.5" />
                  <div>
                    <h2 className="text-sm font-medium text-gray-700 mb-1">Notas del entrenamiento</h2>
                    <p className="text-gray-600 whitespace-pre-line">{workout.notes}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-900">Detalle de series</h2>

              {setsByExercise.length === 0 ? (
                <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
                  No se registraron series para este entrenamiento.
                </div>
              ) : (
                <div className="space-y-4">
                  {setsByExercise.map(({ exerciseName, sets }) => (
                    <div key={exerciseName} className="bg-white rounded-xl shadow-sm p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-900">{exerciseName}</h3>
                        <span className="text-sm text-gray-500">
                          {sets.length} {sets.length === 1 ? 'serie' : 'series'}
                        </span>
                      </div>
                      <div className="space-y-3">
                        {sets.map((set) => (
                          <div
                            key={set.id}
                            className="border border-gray-100 rounded-lg p-4 flex flex-wrap items-center gap-4"
                          >
                            <div className="text-sm text-gray-500 w-24">Serie #{set.setNumber}</div>
                            <div className="flex items-center gap-2 text-gray-900 text-sm font-medium">
                              <span>{set.reps} rep{set.reps === 1 ? '' : 's'}</span>
                              <span className="text-gray-300">•</span>
                              <span>{set.weight !== undefined && set.weight !== null ? `${set.weight} kg` : 'Peso libre'}</span>
                            </div>
                            <div className="text-sm text-gray-500">
                              Técnica: <span className="text-gray-900 font-medium capitalize">{set.technique}</span>
                            </div>
                            {calculateVolume(set) > 0 && (
                              <div className="flex items-center text-sm text-gray-500">
                                <Dumbbell className="h-4 w-4 mr-1" />
                                Volumen: <span className="ml-1 text-gray-900 font-medium">{calculateVolume(set)} kg·rep</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : !error ? (
          <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
            No se encontró la información del entrenamiento solicitado.
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default WorkoutDetailPage