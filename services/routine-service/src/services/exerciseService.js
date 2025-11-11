const axios = require('axios')

class ExerciseService {
  constructor() {
    this.baseURL = process.env.EXERCISE_SERVICE_URL || 'http://localhost:3002'
  }

  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  async getExerciseWithRetry(exerciseId, maxRetries = 3) {
    let attempt = 0

    while (attempt <= maxRetries) {
      try {
        return await this.getExercise(exerciseId)
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

    throw new Error('Failed to retrieve exercise after retries')
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
      const verificationPromises = exerciseIds.map(id => this.verifyExercise(id))
      const results = await Promise.all(verificationPromises)

      const invalidExercises = results
        .map((result, index) => ({ ...result, id: exerciseIds[index] }))
        .filter(result => !result.exists)
        .map(result => result.id)

      return {
        allValid: invalidExercises.length === 0,
        invalidExercises
      }
    } catch (error) {
      throw new Error(`Failed to verify exercises: ${error.message}`)
    }
  }

  // Get exercise details for multiple exercises
  async getExercises(exerciseIds) {
    try {
      const missingExerciseIdsSet = new Set()
      const exercises = []

      for (const id of exerciseIds) {
        const exercise = await this.getExerciseWithRetry(id)

        if (!exercise) {
          missingExerciseIdsSet.add(id)
          continue
        }

        exercises.push(exercise)
      }

      return {
        exercises,
        missingExerciseIds: Array.from(missingExerciseIdsSet)
      }
    } catch (error) {
      throw new Error(`Failed to get exercises: ${error.message}`)
    }
  }
}

module.exports = new ExerciseService()
