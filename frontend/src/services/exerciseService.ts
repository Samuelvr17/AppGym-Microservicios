import { exerciseApi } from './api'
import type { Exercise, ApiResponse } from '../types'

type ExercisePayload = {
  name: string
  description?: string
  videoPath?: string
  aliases: string[]
}

type ExerciseListResponse =
  | Exercise[]
  | {
      exercises: Exercise[]
      pagination?: {
        page: number
        limit: number
        total: number
        pages: number
      }
    }

type ExerciseListResult = {
  exercises: Exercise[]
  pagination?: {
    page: number
    limit: number
    total: number
    pages: number
  }
}

export const exerciseService = {
  async getExercises(params?: { q?: string; page?: number; limit?: number }): Promise<ExerciseListResult> {
    const searchParams = new URLSearchParams()
    if (params?.q) searchParams.append('q', params.q)
    if (params?.page) searchParams.append('page', params.page.toString())
    if (params?.limit) searchParams.append('limit', params.limit.toString())

    const query = searchParams.toString()
    const url = query ? `/api/exercises?${query}` : '/api/exercises'

    const response = await exerciseApi.get<ApiResponse<ExerciseListResponse>>(url)
    const responseData = response.data.data

    if (Array.isArray(responseData)) {
      return { exercises: responseData }
    }

    return {
      exercises: responseData.exercises ?? [],
      pagination: responseData.pagination,
    }
  },

  async getExercise(id: number): Promise<Exercise> {
    const response = await exerciseApi.get<ApiResponse<Exercise>>(`/api/exercises/${id}`)
    return response.data.data
  },

  async createExercise(exercise: ExercisePayload): Promise<Exercise> {
    const response = await exerciseApi.post<ApiResponse<Exercise>>('/api/exercises', exercise)
    return response.data.data
  },

  async updateExercise(id: number, exercise: Partial<ExercisePayload>): Promise<Exercise> {
    const response = await exerciseApi.put<ApiResponse<Exercise>>(`/api/exercises/${id}`, exercise)
    return response.data.data
  },

  async deleteExercise(id: number): Promise<void> {
    await exerciseApi.delete(`/api/exercises/${id}`)
  },
}