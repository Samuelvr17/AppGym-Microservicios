import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { routineService } from '../services/routineService'
import { workoutService } from '../services/workoutService'
import LoadingSpinner from '../components/LoadingSpinner'
import ErrorMessage from '../components/ErrorMessage'
import {
  User,
  Activity,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Plus,
  Play,
  BarChart3
} from 'lucide-react'

type WorkoutStats = {
  totalWorkouts: number
  completedWorkouts: number
  incompleteWorkouts: number
  totalSets: number
  totalReps: number
  totalWeightLifted: number
  avgDurationMinutes: number
  recentWorkouts: number
  period: string
}

type RoutineStats = {
  totalRoutines: number
  totalExercises: number
  avgExercisesPerRoutine: number | string
  avgSetsPerExercise: number | string
}

type DashboardStats = {
  workouts: WorkoutStats | null
  routines: RoutineStats | null
}

const DashboardPage: React.FC = () => {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentWorkouts, setRecentWorkouts] = useState<any[]>([])
  const [recentRoutines, setRecentRoutines] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadDashboardData()
  }, [])

  const loadDashboardData = async () => {
    try {
      setIsLoading(true)
      setError('')

      const [workoutStats, routineStats, workouts, routines] = await Promise.all([
        workoutService.getStats().catch(() => null),
        routineService.getStats().catch(() => null),
        workoutService.getRecentWorkouts().catch(() => []),
        routineService.getRoutines({ limit: 5 }).catch(() => ({ routines: [] }))
      ])

      setStats({
        workouts: workoutStats,
        routines: routineStats
      })
      setRecentWorkouts(workouts)
      setRecentRoutines(routines.routines || [])
    } catch (err: any) {
      setError('Error al cargar los datos del dashboard')
      console.error('Dashboard error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDuration = (seconds?: number | null) => {
    if (!seconds) return 'N/A'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
  }

  const formatAverageDuration = (minutes?: number | null) => {
    if (minutes === undefined || minutes === null) return 'N/A'
    if (minutes <= 0) return 'N/A'
    const totalSeconds = minutes * 60
    return formatDuration(totalSeconds)
  }

  const displayNumber = (value?: number | null) => {
    if (value === undefined || value === null) {
      return '—'
    }
    return value
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
      </div>
    )
  }

  return (
    <div className="px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-2">
          <User className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">
            ¡Hola, {user?.username}!
          </h1>
        </div>
        <p className="text-gray-600">
          Aquí tienes un resumen de tu progreso y actividad reciente.
        </p>
      </div>

      {error && <ErrorMessage message={error} onRetry={loadDashboardData} />}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Total Workouts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Entrenamientos</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayNumber(stats?.workouts?.totalWorkouts)}
              </p>
            </div>
            <Activity className="h-8 w-8 text-blue-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {displayNumber(stats?.workouts?.completedWorkouts)} completados
          </p>
        </div>

        {/* Total Routines */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rutinas</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayNumber(stats?.routines?.totalRoutines as number | null)}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {displayNumber(stats?.routines?.totalExercises as number | null)} ejercicios totales
          </p>
        </div>

        {/* Average Duration */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Duración Promedio</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatAverageDuration(stats?.workouts?.avgDurationMinutes)}
              </p>
            </div>
            <Clock className="h-8 w-8 text-orange-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Por entrenamiento
          </p>
        </div>

        {/* Total Sets */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Series Totales</p>
              <p className="text-2xl font-bold text-gray-900">
                {displayNumber(stats?.workouts?.totalSets)}
              </p>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-600" />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {displayNumber(stats?.workouts?.totalReps)} repeticiones registradas
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Workouts */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-blue-600" />
              Entrenamientos Recientes
            </h2>
            <Link to="/workouts" className="text-sm text-primary-600 hover:text-primary-700">
              Ver todos
            </Link>
          </div>
          
          {recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {recentWorkouts.slice(0, 5).map((workout) => (
                <div key={workout.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{workout.routineName}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {new Date(workout.startedAt).toLocaleDateString('es-ES')}
                      </span>
                      <span className="flex items-center">
                        <Clock className="h-4 w-4 mr-1" />
                        {formatDuration(workout.duration)}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      workout.isCompleted 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {workout.isCompleted ? 'Completado' : 'En progreso'}
                    </span>
                    <Link
                      to={`/workouts/${workout.id}`}
                      className="text-primary-600 hover:text-primary-700"
                    >
                      <BarChart3 className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Activity className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No tienes entrenamientos recientes</p>
              <Link to="/routines" className="btn-primary text-sm">
                Comenzar Entrenamiento
              </Link>
            </div>
          )}
        </div>

        {/* Recent Routines */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Mis Rutinas
            </h2>
            <Link to="/routines" className="text-sm text-primary-600 hover:text-primary-700">
              Ver todas
            </Link>
          </div>
          
          {recentRoutines.length > 0 ? (
            <div className="space-y-3">
              {recentRoutines.slice(0, 5).map((routine) => (
                <div key={routine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{routine.name}</p>
                    <p className="text-sm text-gray-500">
                      {routine.exercises?.length || 0} ejercicios
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      to={`/workout/start/${routine.id}`}
                      className="btn-primary text-sm flex items-center"
                    >
                      <Play className="h-4 w-4 mr-1" />
                      Entrenar
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 mb-4">No tienes rutinas creadas</p>
              <Link to="/routines/new" className="btn-primary text-sm flex items-center mx-auto w-fit">
                <Plus className="h-4 w-4 mr-1" />
                Crear Rutina
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/routines/new"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-center transition-colors"
          >
            <Plus className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Crear Rutina</p>
          </Link>
          <Link
            to="/routines"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-center transition-colors"
          >
            <Play className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Entrenar Ahora</p>
          </Link>
          <Link
            to="/workouts"
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-center transition-colors"
          >
            <BarChart3 className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Ver Progreso</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default DashboardPage