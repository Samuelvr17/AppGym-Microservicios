const express = require('express')
const { validationResult } = require('express-validator')
const { prisma } = require('../config/database')
const { authenticateToken } = require('../middleware/auth')
const { validateCreateRoutine, validateUpdateRoutine, validateSearch } = require('../middleware/validation')
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/responseHelper')
const exerciseService = require('../services/exerciseService')

const router = express.Router()

// Get all routines for authenticated user
router.get('/', authenticateToken, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { q: searchQuery, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = {
      userId: req.user.userId
    }
    
    if (searchQuery) {
      whereClause.name = {
        contains: searchQuery,
        mode: 'insensitive'
      }
    }

    const [routines, total] = await Promise.all([
      prisma.routine.findMany({
        where: whereClause,
        include: {
          exercises: {
            orderBy: { orderInRoutine: 'asc' }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { updatedAt: 'desc' }
      }),
      prisma.routine.count({ where: whereClause })
    ])

    // Get exercise details for each routine
    const routinesWithExerciseDetails = await Promise.all(
      routines.map(async (routine) => {
        const exerciseIds = routine.exercises.map(ex => ex.exerciseId)
        
        if (exerciseIds.length > 0) {
          try {
            const { exercises: exerciseDetails, missingExerciseIds } = await exerciseService.getExercises(exerciseIds)
            const missingExerciseIdsSet = new Set(missingExerciseIds)

            // Merge exercise details with routine exercise data
            const exercisesWithDetails = routine.exercises.map(routineEx => {
              const exerciseDetail = exerciseDetails.find(ex => ex.id === routineEx.exerciseId)
              const isMissing = missingExerciseIdsSet.has(routineEx.exerciseId)
              return {
                ...routineEx,
                exerciseName: isMissing ? 'Exercise not found' : (exerciseDetail?.name || 'Unknown Exercise'),
                exerciseDescription: isMissing ? null : exerciseDetail?.description,
                exerciseVideoPath: isMissing ? null : exerciseDetail?.videoPath
              }
            })

            return {
              ...routine,
              exercises: exercisesWithDetails
            }
          } catch (error) {
            console.error('Error getting exercise details:', error)
            // Return routine with basic exercise info if service is down
            return {
              ...routine,
              exercises: routine.exercises.map(ex => ({
                ...ex,
                exerciseName: 'Exercise Service Unavailable'
              }))
            }
          }
        }

        return routine
      })
    )

    return successResponse(res, {
      routines: routinesWithExerciseDetails,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Routines retrieved successfully')
    
  } catch (error) {
    console.error('Get routines error:', error)
    return errorResponse(res, 'Failed to retrieve routines')
  }
})

// Get user routine statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const [totalRoutines, totalExercises, avgExercisesPerRoutine] = await Promise.all([
      prisma.routine.count({
        where: { userId: req.user.userId }
      }),
      prisma.routineExercise.count({
        where: {
          routine: {
            userId: req.user.userId
          }
        }
      }),
      prisma.routineExercise.aggregate({
        where: {
          routine: {
            userId: req.user.userId
          }
        },
        _avg: {
          sets: true
        }
      })
    ])

    const avgSetsPerExercise = avgExercisesPerRoutine._avg.sets || 0

    return successResponse(res, {
      totalRoutines,
      totalExercises,
      avgExercisesPerRoutine: totalRoutines > 0 ? (totalExercises / totalRoutines).toFixed(1) : 0,
      avgSetsPerExercise: avgSetsPerExercise.toFixed(1)
    }, 'Routine statistics retrieved successfully')

  } catch (error) {
    console.error('Get routine stats error:', error)
    return errorResponse(res, 'Failed to get routine statistics')
  }
})

// Get routine by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    const routineId = Number.parseInt(id, 10)

    if (!Number.isInteger(routineId)) {
      return errorResponse(res, 'Invalid routine ID', 400)
    }

    const routine = await prisma.routine.findUnique({
      where: {
        id: routineId,
        userId: req.user.userId // Ensure user owns the routine
      },
      include: {
        exercises: {
          orderBy: { orderInRoutine: 'asc' }
        }
      }
    })

    if (!routine) {
      return errorResponse(res, 'Routine not found', 404)
    }

    // Get exercise details
    const exerciseIds = routine.exercises.map(ex => ex.exerciseId)
    
    if (exerciseIds.length > 0) {
      try {
        const { exercises: exerciseDetails, missingExerciseIds } = await exerciseService.getExercises(exerciseIds)
        const missingExerciseIdsSet = new Set(missingExerciseIds)

        // Merge exercise details with routine exercise data
        const exercisesWithDetails = routine.exercises.map(routineEx => {
          const exerciseDetail = exerciseDetails.find(ex => ex.id === routineEx.exerciseId)
          const isMissing = missingExerciseIdsSet.has(routineEx.exerciseId)
          return {
            ...routineEx,
            exerciseName: isMissing ? 'Exercise not found' : (exerciseDetail?.name || 'Unknown Exercise'),
            exerciseDescription: isMissing ? null : exerciseDetail?.description,
            exerciseVideoPath: isMissing ? null : exerciseDetail?.videoPath
          }
        })

        routine.exercises = exercisesWithDetails
      } catch (error) {
        console.error('Error getting exercise details:', error)
        // Return routine with basic exercise info if service is down
        routine.exercises = routine.exercises.map(ex => ({
          ...ex,
          exerciseName: 'Exercise Service Unavailable'
        }))
      }
    }

    return successResponse(res, routine, 'Routine retrieved successfully')
    
  } catch (error) {
    console.error('Get routine error:', error)
    return errorResponse(res, 'Failed to retrieve routine')
  }
})

// Create new routine
router.post('/', authenticateToken, validateCreateRoutine, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { name, description, exercises } = req.body

    // Verify all exercises exist
    const exerciseIds = exercises.map(ex => ex.exerciseId)
    const verification = await exerciseService.verifyExercises(exerciseIds)
    
    if (!verification.allValid) {
      return errorResponse(res, 
        `Invalid exercises: ${verification.invalidExercises.join(', ')}`, 
        400
      )
    }

    // Validate rep ranges
    for (const exercise of exercises) {
      if (exercise.repRangeMin && exercise.repRangeMax) {
        if (exercise.repRangeMin > exercise.repRangeMax) {
          return errorResponse(res, 
            `Invalid rep range for exercise ${exercise.exerciseId}: min cannot be greater than max`, 
            400
          )
        }
      }
    }

    // Create routine with exercises in a transaction
    const routine = await prisma.$transaction(async (tx) => {
      // Create the routine
      const newRoutine = await tx.routine.create({
        data: {
          userId: req.user.userId,
          name,
          description
        }
      })

      // Create routine exercises
      await tx.routineExercise.createMany({
        data: exercises.map(exercise => ({
          routineId: newRoutine.id,
          exerciseId: exercise.exerciseId,
          sets: exercise.sets,
          repRangeMin: exercise.repRangeMin,
          repRangeMax: exercise.repRangeMax,
          technique: exercise.technique || 'normal',
          orderInRoutine: exercise.orderInRoutine
        }))
      })

      // Return routine with exercises
      return await tx.routine.findUnique({
        where: { id: newRoutine.id },
        include: {
          exercises: {
            orderBy: { orderInRoutine: 'asc' }
          }
        }
      })
    })

    // Get exercise details for response
    try {
      const { exercises: exerciseDetails, missingExerciseIds } = await exerciseService.getExercises(exerciseIds)
      const missingExerciseIdsSet = new Set(missingExerciseIds)

      // Merge exercise details with routine exercise data
      const exercisesWithDetails = routine.exercises.map(routineEx => {
        const exerciseDetail = exerciseDetails.find(ex => ex.id === routineEx.exerciseId)
        const isMissing = missingExerciseIdsSet.has(routineEx.exerciseId)
        return {
          ...routineEx,
          exerciseName: isMissing ? 'Exercise not found' : (exerciseDetail?.name || 'Unknown Exercise'),
          exerciseDescription: isMissing ? null : exerciseDetail?.description,
          exerciseVideoPath: isMissing ? null : exerciseDetail?.videoPath
        }
      })

      routine.exercises = exercisesWithDetails
    } catch (error) {
      console.error('Error getting exercise details for new routine:', error)
    }

    return successResponse(res, routine, 'Routine created successfully', 201)
    
  } catch (error) {
    console.error('Create routine error:', error)
    return errorResponse(res, 'Failed to create routine')
  }
})

// Update routine
router.put('/:id', authenticateToken, validateUpdateRoutine, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { id } = req.params
    const { name, description, exercises } = req.body

    // Check if routine exists and belongs to user
    const existingRoutine = await prisma.routine.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    })

    if (!existingRoutine) {
      return errorResponse(res, 'Routine not found', 404)
    }

    // If exercises are being updated, verify they exist
    if (exercises) {
      const exerciseIds = exercises.map(ex => ex.exerciseId)
      const verification = await exerciseService.verifyExercises(exerciseIds)
      
      if (!verification.allValid) {
        return errorResponse(res, 
          `Invalid exercises: ${verification.invalidExercises.join(', ')}`, 
          400
        )
      }

      // Validate rep ranges
      for (const exercise of exercises) {
        if (exercise.repRangeMin && exercise.repRangeMax) {
          if (exercise.repRangeMin > exercise.repRangeMax) {
            return errorResponse(res, 
              `Invalid rep range for exercise ${exercise.exerciseId}: min cannot be greater than max`, 
              400
            )
          }
        }
      }
    }

    // Update routine in a transaction
    const updatedRoutine = await prisma.$transaction(async (tx) => {
      // Update routine basic info
      const routine = await tx.routine.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          updatedAt: new Date()
        }
      })

      // Update exercises if provided
      if (exercises) {
        // Delete existing routine exercises
        await tx.routineExercise.deleteMany({
          where: { routineId: parseInt(id) }
        })

        // Create new routine exercises
        await tx.routineExercise.createMany({
          data: exercises.map(exercise => ({
            routineId: parseInt(id),
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            repRangeMin: exercise.repRangeMin,
            repRangeMax: exercise.repRangeMax,
            technique: exercise.technique || 'normal',
            orderInRoutine: exercise.orderInRoutine
          }))
        })
      }

      // Return updated routine with exercises
      return await tx.routine.findUnique({
        where: { id: parseInt(id) },
        include: {
          exercises: {
            orderBy: { orderInRoutine: 'asc' }
          }
        }
      })
    })

    // Get exercise details for response
    const exerciseIds = updatedRoutine.exercises.map(ex => ex.exerciseId)
    
    if (exerciseIds.length > 0) {
      try {
        const { exercises: exerciseDetails, missingExerciseIds } = await exerciseService.getExercises(exerciseIds)
        const missingExerciseIdsSet = new Set(missingExerciseIds)

        // Merge exercise details with routine exercise data
        const exercisesWithDetails = updatedRoutine.exercises.map(routineEx => {
          const exerciseDetail = exerciseDetails.find(ex => ex.id === routineEx.exerciseId)
          const isMissing = missingExerciseIdsSet.has(routineEx.exerciseId)
          return {
            ...routineEx,
            exerciseName: isMissing ? 'Exercise not found' : (exerciseDetail?.name || 'Unknown Exercise'),
            exerciseDescription: isMissing ? null : exerciseDetail?.description,
            exerciseVideoPath: isMissing ? null : exerciseDetail?.videoPath
          }
        })

        updatedRoutine.exercises = exercisesWithDetails
      } catch (error) {
        console.error('Error getting exercise details for updated routine:', error)
      }
    }

    return successResponse(res, updatedRoutine, 'Routine updated successfully')
    
  } catch (error) {
    console.error('Update routine error:', error)
    return errorResponse(res, 'Failed to update routine')
  }
})

// Delete routine
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if routine exists and belongs to user
    const routine = await prisma.routine.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    })

    if (!routine) {
      return errorResponse(res, 'Routine not found', 404)
    }

    // Delete routine (exercises will be deleted automatically due to CASCADE)
    await prisma.routine.delete({
      where: { id: parseInt(id) }
    })

    return successResponse(res, null, 'Routine deleted successfully')
    
  } catch (error) {
    console.error('Delete routine error:', error)
    return errorResponse(res, 'Failed to delete routine')
  }
})

// Duplicate routine
router.post('/:id/duplicate', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { name } = req.body

    if (!name) {
      return errorResponse(res, 'New routine name is required', 400)
    }

    // Check if original routine exists and belongs to user
    const originalRoutine = await prisma.routine.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      },
      include: {
        exercises: {
          orderBy: { orderInRoutine: 'asc' }
        }
      }
    })

    if (!originalRoutine) {
      return errorResponse(res, 'Original routine not found', 404)
    }

    // Create duplicate routine in a transaction
    const duplicatedRoutine = await prisma.$transaction(async (tx) => {
      // Create the new routine
      const newRoutine = await tx.routine.create({
        data: {
          userId: req.user.userId,
          name,
          description: originalRoutine.description
        }
      })

      // Copy all exercises
      if (originalRoutine.exercises.length > 0) {
        await tx.routineExercise.createMany({
          data: originalRoutine.exercises.map(exercise => ({
            routineId: newRoutine.id,
            exerciseId: exercise.exerciseId,
            sets: exercise.sets,
            repRangeMin: exercise.repRangeMin,
            repRangeMax: exercise.repRangeMax,
            technique: exercise.technique,
            orderInRoutine: exercise.orderInRoutine
          }))
        })
      }

      // Return new routine with exercises
      return await tx.routine.findUnique({
        where: { id: newRoutine.id },
        include: {
          exercises: {
            orderBy: { orderInRoutine: 'asc' }
          }
        }
      })
    })

    return successResponse(res, duplicatedRoutine, 'Routine duplicated successfully', 201)
    
  } catch (error) {
    console.error('Duplicate routine error:', error)
    return errorResponse(res, 'Failed to duplicate routine')
  }
})

// Health check with database status
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.routine.count()
    
    // Test Exercise Service connection
    let exerciseServiceStatus = 'Connected'
    try {
      await exerciseService.verifyExercise(1) // Test call
    } catch (error) {
      exerciseServiceStatus = 'Disconnected'
    }
    
    return successResponse(res, {
      service: 'Routine Service',
      database: 'Connected',
      exerciseService: exerciseServiceStatus,
      uptime: process.uptime()
    }, 'Service is healthy')
    
  } catch (error) {
    console.error('Health check error:', error)
    return res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      data: {
        service: 'Routine Service',
        database: 'Disconnected',
        uptime: process.uptime()
      }
    })
  }
})

module.exports = router
