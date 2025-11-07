// Auth types
export interface User {
  id: number
  username: string
  role: 'user' | 'admin'
  createdAt: string
}

export interface AuthData {
  token: string
  user: User
}

export interface AuthResponse {
  success: boolean
  message: string
  data: AuthData
  timestamp: string
}

export interface LoginRequest {
  username: string
  password: string
}

export interface RegisterRequest {
  username: string
  password: string
}

// Exercise types
export interface Exercise {
  id: number
  name: string
  description?: string
  videoPath?: string
  aliases: string[]
  createdBy: number
  createdAt: string
  updatedAt: string
}

export interface CreateExerciseRequest {
  name: string
  description?: string
  aliases: string[]
}

// Routine types
export interface RoutineExercise {
  id: number
  exerciseId: number
  exerciseName: string
  exerciseDescription?: string
  exerciseVideoPath?: string
  sets: number
  repRangeMin?: number
  repRangeMax?: number
  technique: 'normal' | 'dropset' | 'myo-reps' | 'failure' | 'rest-pause'
  orderInRoutine: number
}

export interface Routine {
  id: number
  userId: number
  name: string
  description?: string
  exercises: RoutineExercise[]
  createdAt: string
  updatedAt: string
}

export interface CreateRoutineRequest {
  name: string
  description?: string
  exercises: Omit<RoutineExercise, 'id' | 'exerciseName'>[]
}

// Workout types
export interface WorkoutSet {
  id: number
  exerciseId: number
  exerciseName: string
  setNumber: number
  weight?: number
  reps: number
  technique: string
  completedAt: string
}

export interface Workout {
  id: number
  userId: number
  routineId: number
  routineName: string
  startedAt: string
  completedAt?: string
  duration?: number
  notes?: string
  sets: WorkoutSet[]
  createdAt: string
}

export interface CreateWorkoutRequest {
  routineId: number
  routineName: string
  startedAt: string
  completedAt?: string
  duration?: number
  notes?: string
  sets: Omit<WorkoutSet, 'id' | 'completedAt'>[]
}

// API Response types
export interface ApiResponse<T> {
  success: boolean
  data: T
  message?: string
}

export interface ApiError {
  success: false
  message: string
  error?: string
}