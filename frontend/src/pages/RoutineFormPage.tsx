import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, Plus, Search, Trash2 } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { exerciseService } from '../services/exerciseService'
import { routineService } from '../services/routineService'
import type { CreateRoutineRequest, Exercise, RoutineExercise } from '../types'

type Technique = RoutineExercise['technique']

type RoutineExerciseForm = {
  exerciseId: number
  exerciseName: string
  sets: number
  repRangeMin?: number
  repRangeMax?: number
  technique: Technique
}

const TECHNIQUE_OPTIONS: Technique[] = ['normal', 'dropset', 'myo-reps', 'failure', 'rest-pause']

const RoutineFormPage: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = Boolean(id)

  const [formData, setFormData] = useState({
    name: '',
    description: ''
  })
  const [routineExercises, setRoutineExercises] = useState<RoutineExerciseForm[]>([])
  const [isLoadingRoutine, setIsLoadingRoutine] = useState(isEditMode)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [searchTerm, setSearchTerm] = useState('')
  const [searchResults, setSearchResults] = useState<Exercise[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [hasSearched, setHasSearched] = useState(false)

  const loadRoutine = useCallback(async () => {
    if (!id) {
      return
    }

    try {
      setIsLoadingRoutine(true)
      setError('')
      const routine = await routineService.getRoutine(Number(id))
      setFormData({
        name: routine.name,
        description: routine.description ?? ''
      })
      setRoutineExercises(
        routine.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          repRangeMin: exercise.repRangeMin ?? undefined,
          repRangeMax: exercise.repRangeMax ?? undefined,
          technique: exercise.technique
        }))
      )
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al cargar la rutina'
      setError(message)
    } finally {
      setIsLoadingRoutine(false)
    }
  }, [id])

  useEffect(() => {
    if (isEditMode) {
      void loadRoutine()
    }
  }, [isEditMode, loadRoutine])

  const addedExerciseIds = useMemo(() => new Set(routineExercises.map((exercise) => exercise.exerciseId)), [routineExercises])

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      setSearchError('Ingresa un término de búsqueda para encontrar ejercicios.')
      setSearchResults([])
      setHasSearched(false)
      return
    }

    try {
      setIsSearching(true)
      setSearchError('')
      setHasSearched(true)
      const exercises = await exerciseService.search(searchTerm.trim())
      setSearchResults(exercises)
    } catch (err: any) {
      const message = err?.response?.data?.message || 'No se pudieron cargar los ejercicios.'
      setSearchError(message)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddExercise = (exercise: Exercise) => {
    if (addedExerciseIds.has(exercise.id)) {
      return
    }

    setRoutineExercises((prev) => [
      ...prev,
      {
        exerciseId: exercise.id,
        exerciseName: exercise.name,
        sets: 3,
        repRangeMin: undefined,
        repRangeMax: undefined,
        technique: 'normal'
      }
    ])
  }

  const handleRemoveExercise = (index: number) => {
    setRoutineExercises((prev) => prev.filter((_, idx) => idx !== index))
  }

  const moveExercise = (index: number, direction: 'up' | 'down') => {
    setRoutineExercises((prev) => {
      const newExercises = [...prev]
      const targetIndex = direction === 'up' ? index - 1 : index + 1

      if (targetIndex < 0 || targetIndex >= newExercises.length) {
        return prev
      }

      const [movedExercise] = newExercises.splice(index, 1)
      newExercises.splice(targetIndex, 0, movedExercise)
      return newExercises
    })
  }

  const handleExerciseFieldChange = <K extends keyof RoutineExerciseForm>(
    index: number,
    field: K,
    value: string
  ) => {
    setRoutineExercises((prev) =>
      prev.map((exercise, idx) => {
        if (idx !== index) {
          return exercise
        }

        if (field === 'technique') {
          return { ...exercise, technique: value as Technique }
        }

        if (field === 'sets') {
          const parsed = Number(value)
          return { ...exercise, sets: Number.isNaN(parsed) ? 0 : Math.max(1, parsed) }
        }

        const numericValue = value === '' ? undefined : Number(value)

        if (field === 'repRangeMin') {
          return { ...exercise, repRangeMin: numericValue }
        }

        if (field === 'repRangeMax') {
          return { ...exercise, repRangeMax: numericValue }
        }

        return exercise
      })
    )
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.name.trim()) {
      setError('El nombre de la rutina es obligatorio.')
      return false
    }

    if (routineExercises.length === 0) {
      setError('Agrega al menos un ejercicio a la rutina.')
      return false
    }

    for (const exercise of routineExercises) {
      if (!exercise.sets || exercise.sets < 1) {
        setError(`Define la cantidad de series para ${exercise.exerciseName}.`)
        return false
      }

      if (
        exercise.repRangeMin !== undefined &&
        exercise.repRangeMax !== undefined &&
        exercise.repRangeMin > exercise.repRangeMax
      ) {
        setError(`El rango de repeticiones en ${exercise.exerciseName} no es válido.`)
        return false
      }
    }

    setError('')
    return true
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!validateForm()) {
      return
    }

    const payload: CreateRoutineRequest = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      exercises: routineExercises.map((exercise, index) => {
        const baseExercise: CreateRoutineRequest['exercises'][number] = {
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          technique: exercise.technique,
          orderInRoutine: index + 1
        }

        if (exercise.repRangeMin !== undefined) {
          baseExercise.repRangeMin = exercise.repRangeMin
        }

        if (exercise.repRangeMax !== undefined) {
          baseExercise.repRangeMax = exercise.repRangeMax
        }

        return baseExercise
      })
    }

    try {
      setIsSubmitting(true)
      setError('')

      if (isEditMode && id) {
        await routineService.updateRoutine(Number(id), payload)
      } else {
        await routineService.createRoutine(payload)
      }

      navigate('/routines')
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Error al guardar la rutina.'
      setError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingRoutine) {
    return (
      <div className="flex items-center justify-center py-16">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-5xl mx-auto space-y-6 px-4 sm:px-0">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
              {isEditMode ? 'Editar rutina' : 'Crear nueva rutina'}
            </h1>
            <p className="text-sm text-gray-600 sm:text-base">
              Configura tu rutina y añade ejercicios personalizados para tus atletas o para ti mismo.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Link to="/routines" className="btn-secondary sm:w-auto">
              Volver a rutinas
            </Link>
            {error && <ErrorMessage message={error} onRetry={() => setError('')} />}
          </div>
        </header>

        <section className="card-surface p-5 sm:p-6 space-y-5">
          <div className="space-y-1">
            <h2 className="text-xl font-semibold text-gray-900">Buscar ejercicios</h2>
            <p className="text-sm text-gray-500">
              Encuentra ejercicios por nombre o alias y agrégalos a tu rutina.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void handleSearch()
                  }
                }}
                placeholder="Buscar ejercicios..."
                className="input-field pl-11"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="btn-primary sm:w-44 flex items-center justify-center gap-2"
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="sm" />
                  Buscando...
                </>
              ) : (
                'Buscar'
              )}
            </button>
          </div>

          {searchError && <p className="text-sm text-red-600">{searchError}</p>}

          <div className="space-y-3">
            {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
              <p className="rounded-xl border border-dashed border-gray-300 bg-gray-50 px-4 py-3 text-sm text-gray-500">
                No se encontraron ejercicios para la búsqueda realizada.
              </p>
            )}

            {searchResults.map((exercise) => {
              const isAdded = addedExerciseIds.has(exercise.id)
              return (
                <div
                  key={exercise.id}
                  className="rounded-2xl border border-gray-200 bg-white/80 p-4 sm:p-5 shadow-sm transition hover:border-primary-200"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="space-y-2">
                      <h3 className="text-base font-semibold text-gray-900">{exercise.name}</h3>
                      {exercise.description && (
                        <p className="text-sm text-gray-600 line-clamp-3">{exercise.description}</p>
                      )}
                      {exercise.aliases.length > 0 && (
                        <p className="text-xs text-gray-400">
                          Aliases: {exercise.aliases.join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleAddExercise(exercise)}
                      disabled={isAdded}
                      className={`btn-primary sm:w-40 ${isAdded ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      {isAdded ? 'Agregado' : 'Agregar'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        <form onSubmit={handleSubmit} className="space-y-6 pb-28 md:pb-0">
          <section className="card-surface p-5 sm:p-6 space-y-4">
            <div className="space-y-3">
              <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                Nombre de la rutina
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="Ej. Rutina de fuerza superior"
                required
              />
            </div>
            <div className="space-y-3">
              <label htmlFor="description" className="text-sm font-semibold text-gray-700">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field min-h-[140px] resize-y"
                placeholder="Añade detalles, objetivos o notas sobre la rutina"
              />
            </div>
          </section>

          <section className="card-surface p-5 sm:p-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Ejercicios seleccionados</h2>
              <p className="text-sm text-gray-500">Ordena y ajusta los parámetros de cada ejercicio.</p>
            </div>

            {routineExercises.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-300 bg-gray-50 py-12 text-center text-gray-500">
                <p>Aún no has agregado ejercicios. Usa el buscador superior para hacerlo.</p>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                {routineExercises.map((exercise, index) => (
                  <div key={`${exercise.exerciseId}-${index}`} className="rounded-2xl border border-gray-200 p-4 sm:p-5 shadow-sm">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-xs uppercase tracking-wide text-gray-400">Ejercicio #{index + 1}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{exercise.exerciseName}</h3>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:text-gray-500"
                          title="Mover arriba"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExercise(index, 'down')}
                          disabled={index === routineExercises.length - 1}
                          className="inline-flex items-center justify-center rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:text-gray-500"
                          title="Mover abajo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="inline-flex items-center justify-center rounded-xl border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Series</label>
                        <input
                          type="number"
                          min={1}
                          value={exercise.sets}
                          onChange={(event) => handleExerciseFieldChange(index, 'sets', event.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Repeticiones mínimas</label>
                        <input
                          type="number"
                          min={0}
                          value={exercise.repRangeMin ?? ''}
                          onChange={(event) => handleExerciseFieldChange(index, 'repRangeMin', event.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Repeticiones máximas</label>
                        <input
                          type="number"
                          min={0}
                          value={exercise.repRangeMax ?? ''}
                          onChange={(event) => handleExerciseFieldChange(index, 'repRangeMax', event.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Técnica</label>
                        <select
                          value={exercise.technique}
                          onChange={(event) => handleExerciseFieldChange(index, 'technique', event.target.value)}
                          className="input-field"
                        >
                          {TECHNIQUE_OPTIONS.map((techniqueOption) => (
                            <option key={techniqueOption} value={techniqueOption}>
                              {techniqueOption}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <div className="md:flex md:justify-end">
            <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-gray-200 bg-white/95 px-4 py-4 backdrop-blur md:static md:border-0 md:bg-transparent md:px-0 md:py-0 md:backdrop-blur-0 md:flex md:gap-3">
              <button
                type="button"
                onClick={() => navigate('/routines')}
                className="btn-secondary w-full md:w-auto"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-primary mt-3 w-full md:mt-0 md:w-auto flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" />
                    Guardando...
                  </>
                ) : (
                  isEditMode ? 'Actualizar rutina' : 'Crear rutina'
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RoutineFormPage
