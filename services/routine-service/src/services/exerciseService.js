const axios = require('axios')

class ExerciseService {
  constructor() {
    this.baseURL = process.env.EXERCISE_SERVICE_URL || 'http://localhost:3002'
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

      const exercisePromises = exerciseIds.map(async (id) => {
        const exercise = await this.getExercise(id)
        if (!exercise) {
          missingExerciseIdsSet.add(id)
        }
        return exercise
      })

      const exerciseResults = await Promise.all(exercisePromises)
      const exercises = exerciseResults.filter(Boolean)

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
