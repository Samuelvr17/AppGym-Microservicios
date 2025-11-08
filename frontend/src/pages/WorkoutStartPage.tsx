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
}

type ExerciseWorkoutForm = {
  exerciseId: number
  exerciseName: string
  targetRange?: string
  exerciseDescription?: string
  exerciseVideoPath?: string
  sets: WorkoutSetForm[]
  notes: string
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
      return `${exercise.repRangeMin} reps`
    }
    return `${exercise.repRangeMin}-${exercise.repRangeMax} reps`
  }

  if (exercise.repRangeMin) {
    return `≥ ${exercise.repRangeMin} reps`
  }

  if (exercise.repRangeMax) {
    return `≤ ${exercise.repRangeMax} reps`
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

    const numericRoutineId = Number(routineId)

    if (Number.isNaN(numericRoutineId) || !Number.isInteger(numericRoutineId)) {
      setError('No se proporcionó una rutina válida.')
      setIsLoading(false)
      return
    }

    const loadRoutine = async () => {
      try {
        setIsLoading(true)
        const data = await routineService.getRoutine(numericRoutineId)
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
              technique: exercise.technique
            })),
            notes: ''
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

  const handleExerciseNotesChange = (exerciseIndex: number, value: string) => {
    setExercises((prev) =>
      prev.map((exercise, exIdx) => {
        if (exIdx !== exerciseIndex) {
          return exercise
        }

        return {
          ...exercise,
          notes: value
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
              technique: lastSet?.technique ?? (routine?.exercises[exIdx]?.technique ?? 'normal')
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
        if (!Number.isFinite(repsValue) || repsValue < 1) {
          setFormError('Cada serie debe tener al menos 1 repetición.')
          return
        }

        if (weightValue !== undefined && !Number.isFinite(weightValue)) {
          setFormError('El peso debe ser un número válido.')
          return
        }

        flattenedSets.push({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          setNumber: index + 1,
          weight: weightValue,
          reps: Math.round(repsValue),
          technique: set.technique
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

    const exerciseNotes = exercises
      .map((exercise) => exercise.notes.trim())
      .map((note, index) => ({ note, name: exercises[index].exerciseName }))
      .filter(({ note }) => note.length > 0)

    const combinedNotes =
      exerciseNotes.length > 0
        ? exerciseNotes.map(({ name, note }) => `${name}: ${note}`).join('\n')
        : undefined

    const payload: CreateWorkoutRequest = {
      routineId: routine.id,
      routineName: routine.name,
      startedAt: startedAtISO,
      completedAt: completedAtISO,
      duration: totalDurationSeconds,
      notes: combinedNotes,
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
    <div className="py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6 px-0">
        <div className="space-y-3 px-4 sm:px-0">
          <Link
            to="/routines"
            className="inline-flex items-center text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Volver a rutinas
          </Link>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">{routine.name}</h1>
            {routine.description && (
              <p className="text-base text-gray-600 max-w-2xl">{routine.description}</p>
            )}
            <p className="text-sm text-gray-500">
              {routine.exercises.length} ejercicios · {totalSets} series planificadas
            </p>
          </div>
        </div>

        <div className="space-y-6 px-4 sm:px-0">
          <section className="card-surface p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-50 text-primary-600">
                  <Timer className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Temporizador de descanso</h2>
                  <p className="text-sm text-gray-500">Controla tus pausas entre series sin salir de la vista.</p>
                </div>
              </div>
              <span className="font-mono text-2xl text-gray-800 tabular-nums">{formatSeconds(timerSeconds)}</span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap">
              <button
                type="button"
                onClick={handleTimerStart}
                className="btn-primary flex items-center justify-center gap-2 text-sm"
                disabled={isTimerRunning}
              >
                <Play className="h-4 w-4" />
                Iniciar
              </button>
              <button
                type="button"
                onClick={handleTimerPause}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
                disabled={!isTimerRunning}
              >
                <Pause className="h-4 w-4" />
                Pausar
              </button>
              <button
                type="button"
                onClick={handleTimerReset}
                className="btn-secondary flex items-center justify-center gap-2 text-sm"
              >
                <RotateCcw className="h-4 w-4" />
                Reiniciar
              </button>
              <button
                type="button"
                onClick={handleWorkoutComplete}
                className="btn-primary flex items-center justify-center gap-2 text-sm col-span-2 sm:col-span-1"
              >
                <CheckCircle className="h-4 w-4" />
                {workoutCompleted ? 'Actualizar finalización' : 'Finalizar entrenamiento'}
              </button>
            </div>
            {durationSeconds !== null && completedAt && (
              <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm text-green-700">
                Duración registrada: {formatSeconds(durationSeconds)} · Fin: {completedAt.toLocaleString()}
              </p>
            )}
          </section>

          {exercises.length === 0 ? (
            <div className="card-surface p-8 text-center">
              <p className="text-gray-600">Esta rutina no tiene ejercicios configurados.</p>
              <Link to={`/routines/${routine.id}`} className="btn-primary inline-flex items-center gap-2 text-sm mt-4">
                <Plus className="h-4 w-4" />
                Configurar rutina
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
              {exercises.map((exercise, exerciseIndex) => (
                <section key={exercise.exerciseId} className="card-surface p-5 sm:p-6 space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 text-sm font-semibold">
                          {exerciseIndex + 1}
                        </span>
                        <h2 className="text-xl font-semibold text-gray-900 leading-tight">
                          {exercise.exerciseName}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                        {exercise.targetRange && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                            {exercise.targetRange}
                          </span>
                        )}
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                          Técnica: <span className="ml-1 capitalize">{exercises[exerciseIndex].sets[0]?.technique ?? 'normal'}</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          {exercise.sets.length} serie{exercise.sets.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center w-full sm:w-auto">
                      <button
                        type="button"
                        onClick={() => handleOpenVideo(exercise)}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm"
                      >
                        <PlayCircle className="h-4 w-4" />
                        Ver guía
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddSet(exerciseIndex)}
                        className="btn-secondary flex items-center justify-center gap-2 text-sm"
                      >
                        <Plus className="h-4 w-4" />
                        Añadir serie
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:block -mx-5 sm:mx-0 overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Serie
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Peso (kg)
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Reps
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                            Acciones
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {exercise.sets.map((set, setIndex) => (
                          <tr key={`${exercise.exerciseId}-${setIndex}`} className="text-sm text-gray-700">
                            <td className="px-6 py-3 font-medium">{setIndex + 1}</td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={set.weight}
                                onChange={(event) => handleSetFieldChange(exerciseIndex, setIndex, 'weight', event.target.value)}
                                className="input-field"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <input
                                type="number"
                                min="1"
                                step="1"
                                value={set.reps}
                                onChange={(event) => handleSetFieldChange(exerciseIndex, setIndex, 'reps', event.target.value)}
                                className="input-field"
                              />
                            </td>
                            <td className="px-6 py-3">
                              <button
                                type="button"
                                onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                                className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                                disabled={exercise.sets.length <= 1}
                              >
                                <Trash2 className="h-4 w-4" />
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="space-y-3 md:hidden">
                    {exercise.sets.map((set, setIndex) => {
                      const weightInputId = `exercise-${exercise.exerciseId}-set-${setIndex}-weight`
                      const repsInputId = `exercise-${exercise.exerciseId}-set-${setIndex}-reps`
                      return (
                        <div
                          key={`${exercise.exerciseId}-mobile-${setIndex}`}
                          className="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-gray-700">Serie {setIndex + 1}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveSet(exerciseIndex, setIndex)}
                              className="inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-40"
                              disabled={exercise.sets.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                              Quitar
                            </button>
                          </div>
                          <div className="grid grid-cols-1 gap-3">
                            <label htmlFor={weightInputId} className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Peso (kg)
                              <input
                                id={weightInputId}
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="0.5"
                                value={set.weight}
                                onChange={(event) =>
                                  handleSetFieldChange(exerciseIndex, setIndex, 'weight', event.target.value)
                                }
                                className="input-field mt-1"
                              />
                            </label>
                            <label htmlFor={repsInputId} className="text-xs font-medium uppercase tracking-wide text-gray-500">
                              Repeticiones
                              <input
                                id={repsInputId}
                                type="number"
                                inputMode="numeric"
                                min="1"
                                step="1"
                                value={set.reps}
                                onChange={(event) =>
                                  handleSetFieldChange(exerciseIndex, setIndex, 'reps', event.target.value)
                                }
                                className="input-field mt-1"
                              />
                            </label>
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="space-y-2">
                    <label htmlFor={`notes-${exercise.exerciseId}`} className="text-sm font-medium text-gray-700">
                      Notas del ejercicio
                    </label>
                    <textarea
                      id={`notes-${exercise.exerciseId}`}
                      rows={3}
                      value={exercise.notes}
                      onChange={(event) => handleExerciseNotesChange(exerciseIndex, event.target.value)}
                      className="input-field resize-y"
                      placeholder="Registra sensaciones, ajustes de técnica o recordatorios para la siguiente sesión"
                    />
                  </div>
                </section>
              ))}

              {formError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}

              <div className="md:flex md:justify-end">
                <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-0 md:flex md:gap-3">
                  <button
                    type="button"
                    onClick={() => navigate('/dashboard')}
                    className="btn-secondary w-full md:w-auto"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary mt-3 w-full md:mt-0 md:w-auto flex items-center justify-center gap-2"
                    disabled={isSubmitting}
                  >
                    <Save className="h-4 w-4" />
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
