import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowLeft,
  CheckCircle,
  Pause,
  Play,
  PlayCircle,
  Plus,
  RotateCcw,
  Save,
  Timer,
  Trash2
} from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import VideoModal from '../components/VideoModal'
import { routineService } from '../services/routineService'
import { workoutService } from '../services/workoutService'
import type { Routine, RoutineExercise, CreateWorkoutRequest } from '../types'

type Technique = RoutineExercise['technique']

type WorkoutSetForm = {
  weight: string
  reps: string
  technique: Technique
  restTime: string
}

type ExerciseWorkoutForm = {
  exerciseId: number
  exerciseName: string
  targetRange?: string
  exerciseDescription?: string
  exerciseVideoPath?: string
  sets: WorkoutSetForm[]
}

const formatDateTimeLocal = (date: Date) => {
  const offset = date.getTimezoneOffset()
  const localDate = new Date(date.getTime() - offset * 60_000)
  return localDate.toISOString().slice(0, 16)
}

const formatSeconds = (totalSeconds: number) => {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

const getTargetRange = (exercise: RoutineExercise) => {
  if (exercise.repRangeMin && exercise.repRangeMax) {
    if (exercise.repRangeMin === exercise.repRangeMax) {
      return `${exercise.repRangeMin} repeticiones`
    }
    return `${exercise.repRangeMin}-${exercise.repRangeMax} repeticiones`
  }

  if (exercise.repRangeMin) {
    return `≥ ${exercise.repRangeMin} repeticiones`
  }

  if (exercise.repRangeMax) {
    return `≤ ${exercise.repRangeMax} repeticiones`
  }

  return undefined
}

const WorkoutStartPage: React.FC = () => {
  const { routineId } = useParams<{ routineId: string }>()
  const navigate = useNavigate()

  const [routine, setRoutine] = useState<Routine | null>(null)
  const [exercises, setExercises] = useState<ExerciseWorkoutForm[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')

  const [startedAt] = useState(() => formatDateTimeLocal(new Date()))
  const [notes, setNotes] = useState('')

  const [videoModalData, setVideoModalData] = useState<{
    name: string
    videoPath: string
    description?: string
  } | null>(null)

  const [timerSeconds, setTimerSeconds] = useState(0)
  const [isTimerRunning, setIsTimerRunning] = useState(false)
  const [completedAt, setCompletedAt] = useState<Date | null>(null)
  const [durationSeconds, setDurationSeconds] = useState<number | null>(null)
  const workoutCompleted = completedAt !== null

  useEffect(() => {
    if (!routineId) {
      setError('No se proporcionó una rutina válida.')
      setIsLoading(false)
      return
    }

    const loadRoutine = async () => {
      try {
        setIsLoading(true)
        const data = await routineService.getRoutine(Number(routineId))
        setRoutine(data)
        setExercises(
          data.exercises.map((exercise) => ({
            exerciseId: exercise.exerciseId,
            exerciseName: exercise.exerciseName,
            exerciseDescription: exercise.exerciseDescription,
            exerciseVideoPath: exercise.exerciseVideoPath,
            targetRange: getTargetRange(exercise),
            sets: Array.from({ length: exercise.sets }, () => ({
              weight: '',
              reps: '',
              technique: exercise.technique,
              restTime:
                exercise.restTime !== null && exercise.restTime !== undefined
                  ? String(exercise.restTime)
                  : ''
            }))
          }))
        )
        setError('')
      } catch (err: any) {
        const message = err?.response?.data?.message || 'No se pudo cargar la rutina seleccionada.'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    void loadRoutine()
  }, [routineId])

  useEffect(() => {
    let interval: number | undefined
    if (isTimerRunning) {
      interval = window.setInterval(() => {
        setTimerSeconds((prev) => prev + 1)
      }, 1000)
    }

    return () => {
      if (interval) {
        window.clearInterval(interval)
      }
    }
  }, [isTimerRunning])

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises]
  )

  const handleTimerStart = () => setIsTimerRunning(true)
  const handleTimerPause = () => setIsTimerRunning(false)
  const handleTimerReset = () => {
    setIsTimerRunning(false)
    setTimerSeconds(0)
  }

  const handleOpenVideo = (exercise: ExerciseWorkoutForm) => {
    setVideoModalData({
      name: exercise.exerciseName,
      videoPath: exercise.exerciseVideoPath ?? '',
      description: exercise.exerciseDescription
    })
  }

  const handleCloseVideo = () => {
    setVideoModalData(null)
  }

  const handleWorkoutComplete = () => {
    const startedAtDate = new Date(startedAt)
    if (Number.isNaN(startedAtDate.getTime())) {
      setFormError('La fecha de inicio no es válida.')
      return
    }

    const finishedAt = new Date()
    const durationInSeconds = Math.max(
      0,
      Math.round((finishedAt.getTime() - startedAtDate.getTime()) / 1000)
    )

    setIsTimerRunning(false)
    setFormError('')
    setCompletedAt(finishedAt)
    setDurationSeconds(durationInSeconds)
  }

  const handleSetFieldChange = <K extends keyof WorkoutSetForm>(
    exerciseIndex: number,
    setIndex: number,
    field: K,
    value: WorkoutSetForm[K]
  ) => {
    setExercises((prev) =>
      prev.map((exercise, exIdx) => {
        if (exIdx !== exerciseIndex) {
          return exercise
        }

        const updatedSets = exercise.sets.map((set, sIdx) => {
          if (sIdx !== setIndex) {
            return set
          }

          return {
            ...set,
            [field]: value
          }
        })

        return {
          ...exercise,
          sets: updatedSets
        }
      })
    )
  }

  const handleAddSet = (exerciseIndex: number) => {
    setExercises((prev) =>
      prev.map((exercise, exIdx) => {
        if (exIdx !== exerciseIndex) {
          return exercise
        }

        const lastSet = exercise.sets[exercise.sets.length - 1]

        return {
          ...exercise,
          sets: [
            ...exercise.sets,
            {
              weight: '',
              reps: '',
              technique: lastSet?.technique ?? (routine?.exercises[exIdx]?.technique ?? 'normal'),
              restTime: lastSet?.restTime ??
                (routine?.exercises[exIdx]?.restTime !== null && routine?.exercises[exIdx]?.restTime !== undefined
                  ? String(routine?.exercises[exIdx]?.restTime)
                  : '')
            }
          ]
        }
      })
    )
  }

  const handleRemoveSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) =>
      prev.map((exercise, exIdx) => {
        if (exIdx !== exerciseIndex) {
          return exercise
        }

        if (exercise.sets.length <= 1) {
          return exercise
        }

        return {
          ...exercise,
          sets: exercise.sets.filter((_, idx) => idx !== setIndex)
        }
      })
    )
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!routine) {
      setFormError('No se pudo identificar la rutina seleccionada.')
      return
    }

    if (!startedAt) {
      setFormError('Selecciona la fecha y hora de inicio del entrenamiento.')
      return
    }

    if (exercises.length === 0) {
      setFormError('La rutina no tiene ejercicios configurados.')
      return
    }

    setFormError('')

    const flattenedSets: CreateWorkoutRequest['sets'] = []

    for (const exercise of exercises) {
      for (let index = 0; index < exercise.sets.length; index += 1) {
        const set = exercise.sets[index]
        const repsValue = Number(set.reps)
        const weightValue = set.weight === '' ? undefined : Number(set.weight)
        const restValue = set.restTime === '' ? undefined : Number(set.restTime)

        if (!Number.isFinite(repsValue) || repsValue < 1) {
          setFormError('Cada serie debe tener al menos 1 repetición.')
          return
        }

        if (weightValue !== undefined && !Number.isFinite(weightValue)) {
          setFormError('El peso debe ser un número válido.')
          return
        }

        if (restValue !== undefined && !Number.isFinite(restValue)) {
          setFormError('El tiempo de descanso debe ser un número válido.')
          return
        }

        flattenedSets.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          setNumber: index + 1,
          weight: weightValue,
          reps: Math.round(repsValue),
          technique: set.technique,
          restTime: restValue !== undefined ? Math.round(restValue) : undefined
        })
      }
    }

    if (flattenedSets.length === 0) {
      setFormError('Registra al menos una serie antes de guardar el entrenamiento.')
      return
    }

    const startedAtDate = new Date(startedAt)
    if (Number.isNaN(startedAtDate.getTime())) {
      setFormError('La fecha de inicio no es válida.')
      return
    }

    const startedAtISO = startedAtDate.toISOString()

    if (!completedAt) {
      setFormError('Finaliza el entrenamiento para registrar la hora de término.')
      return
    }

    const completedAtISO = completedAt.toISOString()
    const totalDurationSeconds =
      durationSeconds ??
      Math.max(0, Math.round((completedAt.getTime() - startedAtDate.getTime()) / 1000))

    const payload: CreateWorkoutRequest = {
      routineId: routine.id,
      routineName: routine.name,
      startedAt: startedAtISO,
      completedAt: completedAtISO,
      duration: totalDurationSeconds,
      notes: notes.trim() ? notes.trim() : undefined,
      sets: flattenedSets
    }

    try {
      setIsSubmitting(true)
      setFormError('')
      await workoutService.createWorkout(payload)
      handleTimerReset()
      setCompletedAt(null)
      setDurationSeconds(null)
      navigate('/workouts')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'No se pudo guardar el entrenamiento.'
      setFormError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-8 space-y-4">
        <Link to="/routines" className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver a rutinas
        </Link>
        <ErrorMessage message={error} />
      </div>
    )
  }

  if (!routine) {
    return null
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link
              to="/routines"
              className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700 mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Volver a rutinas
            </Link>
            <h1 className="text-3xl font-bold text-gray-900">{routine.name}</h1>
            {routine.description && (
              <p className="text-gray-600 mt-2 max-w-2xl">{routine.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              {routine.exercises.length} ejercicios · {totalSets} series planificadas
            </p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <Timer className="h-5 w-5 text-primary-600 mr-2" />
                <h2 className="text-lg font-semibold text-gray-900">Temporizador de descanso</h2>
              </div>
              <span className="font-mono text-xl text-gray-800">{formatSeconds(timerSeconds)}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleTimerStart}
                className="btn-primary flex items-center text-sm"
                disabled={isTimerRunning}
              >
                <Play className="h-4 w-4 mr-1" />
                Iniciar
              </button>
              <button
                type="button"
                onClick={handleTimerPause}
                className="btn-secondary flex items-center text-sm"
                disabled={!isTimerRunning}
              >
                <Pause className="h-4 w-4 mr-1" />
                Pausar
              </button>
              <button
                type="button"
                onClick={handleTimerReset}
                className="btn-secondary flex items-center text-sm"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Reiniciar
              </button>
              <button
                type="button"
                onClick={handleWorkoutComplete}
                className="btn-primary flex items-center text-sm"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                {workoutCompleted ? 'Actualizar finalización' : 'Finalizar entrenamiento'}
              </button>
            </div>
            {durationSeconds !== null && completedAt && (
              <p className="mt-3 text-sm text-green-700">
                Duración registrada: {formatSeconds(durationSeconds)} · Fin: {completedAt.toLocaleString()}
              </p>
            )}
          </div>

          {exercises.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <p className="text-gray-600">Esta rutina no tiene ejercicios configurados.</p>
              <Link
                to={`/routines/${routine.id}`}
                className="btn-primary inline-flex items-center text-sm mt-4"
              >
                Configurar rutina
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {exercises.map((exercise, exerciseIndex) => (
                <div key={exercise.exerciseId} className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-start justify-between mb-4 gap-4">
                    <div className="min-w-0">
                      <h2 className="text-xl font-semibold text-gray-900 truncate">{exercise.exerciseName}</h2>
                      <div className="text-sm text-gray-500 mt-1 space-x-3">
                        {exercise.targetRange && <span>Objetivo: {exercise.targetRange}</span>}
                        <span>
                          Técnica inicial:{' '}
                          <span className="capitalize">{exercises[exerciseIndex].sets[0]?.technique ?? 'normal'}</span>
                        </span>
                      </div>
                      {exercise.exerciseDescription && (
                        <p className="mt-2 text-sm text-gray-600 break-words">{exercise.exerciseDescription}</p>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 shrink-0">
                      {(exercise.exerciseVideoPath || exercise.exerciseDescription) && (
                        <button
                          type="button"
                          onClick={() => handleOpenVideo(exercise)}
                          className="btn-secondary flex items-center text-sm"
                        >
                          <PlayCircle className="h-4 w-4 mr-1" />
                          Ver guía
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleAddSet(exerciseIndex)}
                        className="btn-secondary flex items-center text-sm"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Añadir serie
                      </button>
                    </div>
                  </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Serie
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Peso (kg)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Repeticiones
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Descanso (seg)
                            </th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Acciones
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {exercise.sets.map((set, setIndex) => (
                            <tr key={`${exercise.exerciseId}-${setIndex}`}>
                              <td className="px-4 py-3 text-sm text-gray-700">{setIndex + 1}</td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  value={set.weight}
                                  onChange={(event) =>
                                    handleSetFieldChange(exerciseIndex, setIndex, 'weight', event.target.value)
                                  }
                                  className="input-field"
                                  placeholder="Opcional"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="1"
                                  step="1"
                                  value={set.reps}
                                  onChange={(event) =>
                                    handleSetFieldChange(exerciseIndex, setIndex, 'reps', event.target.value)
                                  }
                                  className="input-field"
                                  placeholder={
                                    exercise.targetRange
                                      ? `Ej: ${exercise.targetRange}`
                                      : 'Ingresa repeticiones'
                                  }
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input
                                  type="number"
                                  min="0"
                                  step="5"
                                  value={set.restTime}
                                  onChange={(event) =>
                                    handleSetFieldChange(exerciseIndex, setIndex, 'restTime', event.target.value)
                                  }
                                  className="input-field"
                                  placeholder="Opcional"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                                  className="inline-flex items-center text-sm text-red-600 hover:text-red-700"
                                  disabled={exercise.sets.length <= 1}
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Quitar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}

                <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <textarea
                      rows={4}
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="input-field"
                      placeholder="Registra observaciones importantes, sensaciones o ajustes para la próxima sesión."
                    />
                  </div>

                  {formError && (
                    <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
                      {formError}
                    </div>
                  )}

                  <div className="flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => navigate('/dashboard')}
                      className="btn-secondary"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-primary flex items-center"
                      disabled={isSubmitting}
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Guardando...' : 'Guardar entrenamiento'}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
      </div>

      <VideoModal
        isOpen={Boolean(videoModalData)}
        title={videoModalData?.name ?? ''}
        videoPath={videoModalData?.videoPath ?? ''}
        description={videoModalData?.description}
        onClose={handleCloseVideo}
      />
    </div>
  )
}

export default WorkoutStartPage
