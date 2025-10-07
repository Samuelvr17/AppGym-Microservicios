import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Edit, Plus, Save, Search, Trash2, X } from 'lucide-react'
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
  aliases: '',
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
      aliases: parseAliases(formState.aliases),
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
      aliases: exercise.aliases.join(', '),
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
        <div className="max-w-xl mx-auto bg-white border border-gray-200 rounded-lg shadow-sm p-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900 mb-4">Acceso restringido</h1>
          <p className="text-gray-600">
            Necesitas permisos de administrador para acceder a esta sección.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Administrar Ejercicios</h1>
            <p className="text-gray-600 mt-2">
              Gestiona el catálogo de ejercicios disponibles en la plataforma.
            </p>
          </div>
          <div className="w-full md:w-80">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por nombre o alias..."
                className="input-field pl-10"
              />
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {selectedExercise ? 'Editar ejercicio' : 'Crear nuevo ejercicio'}
              </h2>
              {selectedExercise ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex items-center text-sm text-gray-500 hover:text-gray-700"
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </button>
              ) : (
                <span className="inline-flex items-center text-sm text-gray-500">
                  <Plus className="h-4 w-4 mr-1" />
                  Nuevo
                </span>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Nombre
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

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formState.description}
                  onChange={handleInputChange}
                  className="input-field min-h-[120px]"
                  placeholder="Detalles, consejos o técnica del ejercicio"
                />
              </div>

              <div>
                <label htmlFor="videoPath" className="block text-sm font-medium text-gray-700">
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

              <div>
                <label htmlFor="videoFile" className="block text-sm font-medium text-gray-700">
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
                <p className="text-xs text-gray-500 mt-1">
                  Si cargas un archivo, reemplazará al video existente. También puedes usar solo la URL.
                </p>
              </div>

              <div>
                <label htmlFor="aliases" className="block text-sm font-medium text-gray-700">
                  Aliases
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
                <p className="text-xs text-gray-500 mt-1">
                  Separa cada alias con una coma. Puedes dejar este campo vacío.
                </p>
              </div>

              {formError && <ErrorMessage message={formError} />}

              <button
                type="submit"
                disabled={isSubmitting || isUploadingVideo}
                className="btn-primary w-full flex items-center justify-center"
              >
                {isSubmitting || isUploadingVideo ? (
                  <LoadingSpinner size="sm" className="mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {isUploadingVideo
                  ? 'Subiendo video...'
                  : selectedExercise
                    ? 'Guardar cambios'
                    : 'Crear ejercicio'}
              </button>
              {isUploadingVideo && (
                <p className="flex items-center text-xs text-gray-500">
                  <LoadingSpinner size="sm" className="mr-2" />
                  Procesando el video, por favor espera...
                </p>
              )}
            </form>
          </div>

          <div className="space-y-4">
            {error && <ErrorMessage message={error} onRetry={loadExercises} />}

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : filteredExercises.length > 0 ? (
              <div className="grid gap-4">
                {filteredExercises.map((exercise) => (
                  <div key={exercise.id} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{exercise.name}</h3>
                          {exercise.description && (
                            <p className="text-sm text-gray-600 mt-1">{exercise.description}</p>
                          )}
                        </div>
                        {exercise.aliases.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {exercise.aliases.map((alias) => (
                              <span
                                key={alias}
                                className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-primary-50 text-primary-700"
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
                            className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                          >
                            Ver video
                          </a>
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(exercise)}
                          className="btn-secondary flex items-center justify-center"
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDelete(exercise)}
                          className="inline-flex items-center justify-center border border-red-200 hover:border-red-300 text-red-600 hover:text-red-700 rounded-lg py-2 px-4 transition-colors duration-200"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 text-center">
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminPage