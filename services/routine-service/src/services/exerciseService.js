const axios = require('axios')

class ExerciseService {
  constructor() {
    this.baseURL = process.env.EXERCISE_SERVICE_URL || 'http://localhost:3002'
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async fetchExercisesBatch(exerciseIds, maxRetries = 3) {
    if (!Array.isArray(exerciseIds) || exerciseIds.length === 0) {
      return {
        exerciseMap: new Map(),
        missingExerciseIds: []
      }
    }

    const uniqueIds = Array.from(new Set(exerciseIds))
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        const response = await axios.get(`${this.baseURL}/api/exercises/batch`, {
          params: {
            ids: uniqueIds.join(',')
          }
        })

        const { exercises = [], missingExerciseIds = [] } = response.data.data || {}
        const exerciseMap = new Map(exercises.map(exercise => [exercise.id, exercise]))

        return {
          exerciseMap,
          missingExerciseIds
        }
      } catch (error) {
        const status = error.response?.status

        if (status === 429 && attempt < maxRetries) {
          const retryAfterHeader = error.response?.headers?.['retry-after']
          const retryAfter = Number(retryAfterHeader)
          const backoff = Number.isFinite(retryAfter)
            ? retryAfter * 1000
            : Math.pow(2, attempt) * 200

          attempt += 1
          await this.delay(backoff)
          continue
        }

        throw error
      }
    }

    throw new Error('Failed to retrieve exercises after retries')
  }

  // Verify that an exercise exists
  async verifyExercise(exerciseId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/exercises/${exerciseId}`)
      return {
        exists: true,
        exercise: response.data.data
      }
    } catch (error) {
      if (error.response?.status === 404) {
        return {
          exists: false,
          exercise: null
        }
      }
      throw error
    }
  }

  // Get exercise details
  async getExercise(exerciseId) {
    try {
      const response = await axios.get(`${this.baseURL}/api/exercises/${exerciseId}`)
      return response.data.data
    } catch (error) {
      if (error.response?.status === 404) {
        return null
      }
      throw error
    }
  }

  // Verify multiple exercises exist
  async verifyExercises(exerciseIds) {
    try {
      const { missingExerciseIds } = await this.fetchExercisesBatch(exerciseIds)

      return {
        allValid: missingExerciseIds.length === 0,
        invalidExercises: missingExerciseIds
      }
    } catch (error) {
      throw new Error(`Failed to verify exercises: ${error.message}`)
    }
  }

  // Get exercise details for multiple exercises
  async getExercises(exerciseIds) {
    try {
      const { exerciseMap, missingExerciseIds } = await this.fetchExercisesBatch(exerciseIds)

      const exercises = exerciseIds
        .map(id => exerciseMap.get(id))
        .filter(exercise => Boolean(exercise))

      return {
        exercises,
        missingExerciseIds
      }
    } catch (error) {
      throw new Error(`Failed to get exercises: ${error.message}`)
    }
  }
}

module.exports = new ExerciseService()
