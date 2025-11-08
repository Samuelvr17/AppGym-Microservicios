import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Edit, PlayCircle, Save, Search, Trash2, X } from 'lucide-react'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import { exerciseService } from '../services/exerciseService'
import type { Exercise } from '../types'
import { useAuth } from '../hooks/useAuth'

interface ExerciseFormState {
  name: string
  description: string
  videoPath: string
  aliases: string
}

const defaultFormState: ExerciseFormState = {
  name: '',
  description: '',
  videoPath: '',
  aliases: ''
}

const AdminPage: React.FC = () => {
  const { user } = useAuth()
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [formState, setFormState] = useState<ExerciseFormState>(defaultFormState)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  const [error, setError] = useState('')
  const [formError, setFormError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const videoInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (user?.role === 'admin') {
      void loadExercises()
    }
  }, [user])

  const loadExercises = async () => {
    try {
      setIsLoading(true)
      setError('')
      const { exercises: loadedExercises } = await exerciseService.getExercises()
      setExercises(loadedExercises)
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al cargar los ejercicios'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target
    setFormState((prev) => ({ ...prev, [name]: value }))
  }

  const resetForm = () => {
    setSelectedExercise(null)
    setFormState(defaultFormState)
    setFormError('')
    setVideoFile(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
  }

  const parseAliases = (aliasesValue: string) =>
    aliasesValue
      .split(',')
      .map((alias) => alias.trim())
      .filter((alias) => alias.length > 0)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormError('')

    if (!formState.name.trim()) {
      setFormError('El nombre del ejercicio es obligatorio.')
      return
    }

    const payload = {
      name: formState.name.trim(),
      description: formState.description.trim() || undefined,
      videoPath: formState.videoPath.trim() || undefined,
      aliases: parseAliases(formState.aliases)
    }

    try {
      setIsSubmitting(true)
      const savedExercise = selectedExercise
        ? await exerciseService.updateExercise(selectedExercise.id, payload)
        : await exerciseService.createExercise(payload)

      if (videoFile) {
        setIsUploadingVideo(true)
        await exerciseService.uploadExerciseVideo(savedExercise.id, videoFile)
        setIsUploadingVideo(false)
      }

      await loadExercises()
      resetForm()
    } catch (err: any) {
      const message =
        err.response?.data?.message ||
        (isUploadingVideo ? 'Error al subir el video' : 'Error al guardar el ejercicio')
      setFormError(message)
    } finally {
      setIsSubmitting(false)
      setIsUploadingVideo(false)
    }
  }

  const handleEdit = (exercise: Exercise) => {
    setSelectedExercise(exercise)
    setFormState({
      name: exercise.name,
      description: exercise.description || '',
      videoPath: exercise.videoPath || '',
      aliases: exercise.aliases.join(', ')
    })
    setVideoFile(null)
    if (videoInputRef.current) {
      videoInputRef.current.value = ''
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleVideoFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null
    setVideoFile(file)
  }

  const handleDelete = async (exercise: Exercise) => {
    if (!confirm(`¿Eliminar el ejercicio "${exercise.name}"?`)) {
      return
    }

    try {
      await exerciseService.deleteExercise(exercise.id)
      await loadExercises()
      if (selectedExercise?.id === exercise.id) {
        resetForm()
      }
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al eliminar el ejercicio'
      alert(message)
    }
  }

  const filteredExercises = useMemo(() => {
    if (!searchTerm.trim()) {
      return exercises
    }

    const normalizedSearch = searchTerm.toLowerCase()
    return exercises.filter((exercise) => {
      const matchesName = exercise.name.toLowerCase().includes(normalizedSearch)
      const matchesAlias = exercise.aliases.some((alias) => alias.toLowerCase().includes(normalizedSearch))
      return matchesName || matchesAlias
    })
  }, [exercises, searchTerm])

  if (user?.role !== 'admin') {
    return (
      <div className="px-4 py-16">
        <div className="max-w-xl mx-auto card-surface p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Acceso restringido</h1>
          <p className="text-gray-600">
            Necesitas permisos de administrador para acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="py-6 sm:py-8">
      <div className="max-w-6xl mx-auto space-y-6 px-4 sm:px-0">
        <header className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Administrar Ejercicios</h1>
            <p className="text-sm text-gray-600 sm:text-base">
              Gestiona y mantiene actualizado el catálogo de ejercicios disponibles en la plataforma.
            </p>
          </div>
          <div className="card-surface p-4 sm:p-5">
            <label htmlFor="exercise-search" className="sr-only">
              Buscar ejercicios
            </label>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  id="exercise-search"
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre o alias..."
                  className="input-field pl-11"
                />
              </div>
              <button
                type="button"
                onClick={resetForm}
                className="btn-secondary sm:w-40"
              >
                <X className="h-4 w-4" />
                Limpiar selección
              </button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
          <section className="card-surface p-5 sm:p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedExercise ? 'Editar ejercicio' : 'Crear nuevo ejercicio'}
                </h2>
                <p className="text-sm text-gray-500">
                  Completa los datos para que el equipo pueda encontrarlo fácilmente.
                </p>
              </div>
              {selectedExercise && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                  Cancelar edición
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <label htmlFor="name" className="text-sm font-semibold text-gray-700">
                  Nombre del ejercicio
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={formState.name}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Ej. Press de banca"
                  required
                />
              </div>

              <div className="space-y-3">
                <label htmlFor="description" className="text-sm font-semibold text-gray-700">
                  Descripción y notas técnicas
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="input-field min-h-[140px] resize-y"
                  placeholder="Añade consejos, variaciones o puntos clave de la técnica"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-3">
                  <label htmlFor="videoPath" className="text-sm font-semibold text-gray-700">
                    URL del video (opcional)
                  </label>
                  <input
                    id="videoPath"
                    name="videoPath"
                    type="url"
                    value={formState.videoPath}
                    onChange={handleInputChange}
                    className="input-field"
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-3">
                  <label htmlFor="videoFile" className="text-sm font-semibold text-gray-700">
                    Subir video (opcional)
                  </label>
                  <input
                    id="videoFile"
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoFileChange}
                    className="input-field"
                  />
                  <p className="text-xs text-gray-500">
                    Si subes un archivo, reemplazará al video existente. También puedes usar solo la URL.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <label htmlFor="aliases" className="text-sm font-semibold text-gray-700">
                  Aliases o nombres alternativos
                </label>
                <input
                  id="aliases"
                  name="aliases"
                  type="text"
                  value={formState.aliases}
                  onChange={handleInputChange}
                  className="input-field"
                  placeholder="Separar por comas (ej. press plano, bench press)"
                />
                <p className="text-xs text-gray-500">
                  Ayuda a que los usuarios encuentren el ejercicio utilizando diferentes términos.
                </p>
              </div>

              {formError && <ErrorMessage message={formError} />}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary sm:w-auto"
                >
                  Reiniciar formulario
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || isUploadingVideo}
                  className="btn-primary flex items-center justify-center gap-2 sm:w-auto"
                >
                  {isSubmitting || isUploadingVideo ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  {isUploadingVideo
                    ? 'Subiendo video...'
                    : selectedExercise
                      ? 'Guardar cambios'
                      : 'Crear ejercicio'}
                </button>
              </div>
              {isUploadingVideo && (
                <p className="flex items-center gap-2 text-xs text-gray-500">
                  <LoadingSpinner size="sm" />
                  Procesando el video, por favor espera...
                </p>
              )}
            </form>
          </section>

          <section className="space-y-4">
            {error && <ErrorMessage message={error} onRetry={loadExercises} />}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredExercises.length > 0 ? (
              <div className="space-y-4">
                {filteredExercises.map((exercise) => (
                  <article key={exercise.id} className="card-surface p-5 sm:p-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:justify-between">
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
                          {exercise.description && (
                            <p className="text-sm text-gray-600 leading-relaxed">{exercise.description}</p>
                          )}
                        </div>
                        {exercise.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {exercise.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700"
                              >
                                {alias}
                              </span>
                            ))}
                          </div>
                        )}
                        {exercise.videoPath && (
                          <a
                            href={exerciseService.getExerciseVideoUrl(exercise.videoPath) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
                          >
                            <PlayCircle className="h-4 w-4" />
                            Ver video
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:w-44">
                        <button
                          type="button"
                          onClick={() => handleEdit(exercise)}
                          className="btn-secondary flex items-center justify-center gap-2"
                        >
                          <Edit className="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(exercise)}
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
            ) : (
              <div className="card-surface p-10 text-center">
                <div className="text-5xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm ? 'No se encontraron ejercicios' : 'Aún no hay ejercicios creados'}
                </h3>
                <p className="text-gray-600">
                  {searchTerm
                    ? 'Intenta cambiar los términos de búsqueda.'
                    : 'Crea tu primer ejercicio utilizando el formulario.'}
                </p>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}

export default AdminPage
