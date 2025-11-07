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
    description: '',
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
        description: routine.description ?? '',
      })
      setRoutineExercises(
        routine.exercises.map((exercise) => ({
          exerciseId: exercise.exerciseId,
          exerciseName: exercise.exerciseName,
          sets: exercise.sets,
          repRangeMin: exercise.repRangeMin ?? undefined,
          repRangeMax: exercise.repRangeMax ?? undefined,
          technique: exercise.technique
        })),
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
        technique: 'normal',
      },
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
    value: string,
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
      }),
    )
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
          orderInRoutine: index + 1,
        }

        if (exercise.repRangeMin !== undefined) {
          baseExercise.repRangeMin = exercise.repRangeMin
        }

        if (exercise.repRangeMax !== undefined) {
          baseExercise.repRangeMax = exercise.repRangeMax
        }

        return baseExercise
      }),
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
    <div className="px-4 py-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {isEditMode ? 'Editar Rutina' : 'Crear Nueva Rutina'}
            </h1>
            <p className="text-gray-600 mt-2">Configura tu rutina y añade ejercicios personalizados.</p>
          </div>
          <Link to="/routines" className="btn-secondary self-start">
            Volver a rutinas
          </Link>
        </div>

        {error && <ErrorMessage message={error} onRetry={() => setError('')} />}

        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Buscar ejercicios</h2>
              <p className="text-sm text-gray-500">
                Encuentra ejercicios por nombre o alias y agrégalos a tu rutina.
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
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
                className="input-field pl-10"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSearch()}
              disabled={isSearching}
              className="btn-secondary md:w-auto"
            >
              {isSearching ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Buscando...
                </>
              ) : (
                'Buscar'
              )}
            </button>
          </div>

          {searchError && <p className="text-sm text-red-600 mt-3">{searchError}</p>}

          <div className="mt-4 space-y-3">
            {hasSearched && !isSearching && searchResults.length === 0 && !searchError && (
              <p className="text-sm text-gray-500">No se encontraron ejercicios para la búsqueda realizada.</p>
            )}

            {searchResults.map((exercise) => {
              const isAdded = addedExerciseIds.has(exercise.id)
              return (
                <div
                  key={exercise.id}
                  className="border border-gray-200 rounded-lg p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                >
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{exercise.name}</h3>
                    {exercise.description && (
                      <p className="text-sm text-gray-600 mt-1 line-clamp-2">{exercise.description}</p>
                    )}
                    {exercise.aliases.length > 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Aliases: {exercise.aliases.join(', ')}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddExercise(exercise)}
                    disabled={isAdded}
                    className={`btn-primary md:w-auto ${isAdded ? 'opacity-60 cursor-not-allowed' : ''}`}
                  >
                    <Plus className="h-4 w-4 mr-2 inline" />
                    {isAdded ? 'Agregado' : 'Agregar'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre de la rutina
              </label>
              <input
                id="name"
                name="name"
                type="text"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="Ej. Rutina de fuerza superior"
                required
              />
            </div>
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Descripción (opcional)
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                className="input-field mt-1"
                placeholder="Añade detalles o notas sobre la rutina"
                rows={4}
              />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Ejercicios seleccionados</h2>
              <p className="text-sm text-gray-500">Ordena y ajusta los parámetros de cada ejercicio.</p>
            </div>

            {routineExercises.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p>No has agregado ejercicios todavía. Usa el buscador para añadirlos.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {routineExercises.map((exercise, index) => (
                  <div key={`${exercise.exerciseId}-${index}`} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                      <div>
                        <p className="text-xs uppercase text-gray-400">Ejercicio #{index + 1}</p>
                        <h3 className="text-lg font-semibold text-gray-900">{exercise.exerciseName}</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => moveExercise(index, 'up')}
                          disabled={index === 0}
                          className="p-2 rounded-md border border-gray-200 text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:text-gray-500"
                          title="Mover arriba"
                        >
                          <ArrowUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExercise(index, 'down')}
                          disabled={index === routineExercises.length - 1}
                          className="p-2 rounded-md border border-gray-200 text-gray-500 hover:text-primary-600 disabled:opacity-40 disabled:hover:text-gray-500"
                          title="Mover abajo"
                        >
                          <ArrowDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveExercise(index)}
                          className="p-2 rounded-md border border-red-200 text-red-500 hover:bg-red-50"
                          title="Eliminar ejercicio"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Series
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={exercise.sets}
                          onChange={(event) => handleExerciseFieldChange(index, 'sets', event.target.value)}
                          className="input-field mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Repeticiones mínimas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={exercise.repRangeMin ?? ''}
                          onChange={(event) => handleExerciseFieldChange(index, 'repRangeMin', event.target.value)}
                          className="input-field mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Repeticiones máximas
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={exercise.repRangeMax ?? ''}
                          onChange={(event) => handleExerciseFieldChange(index, 'repRangeMax', event.target.value)}
                          className="input-field mt-1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Técnica
                        </label>
                        <select
                          value={exercise.technique}
                          onChange={(event) => handleExerciseFieldChange(index, 'technique', event.target.value)}
                          className="input-field mt-1"
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
          </div>

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/routines')}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary flex items-center"
            >
              {isSubmitting ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Guardando...
                </>
              ) : (
                isEditMode ? 'Actualizar rutina' : 'Crear rutina'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default RoutineFormPage