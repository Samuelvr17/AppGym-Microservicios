const express = require('express')
const { validationResult } = require('express-validator')
const { prisma } = require('../config/database')
const { authenticateToken } = require('../middleware/auth')
const { validateCreateWorkout, validateSearch } = require('../middleware/validation')
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/responseHelper')
const routineService = require('../services/routineService')
const exerciseService = require('../services/exerciseService')

const router = express.Router()

// Get all workouts for authenticated user
router.get('/', authenticateToken, validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { 
      q: searchQuery, 
      page = 1, 
      limit = 20, 
      startDate, 
      endDate 
    } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = {
      userId: req.user.userId
    }
    
    // Add search filters
    if (searchQuery) {
      whereClause.OR = [
        {
          routineName: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        },
        {
          notes: {
            contains: searchQuery,
            mode: 'insensitive'
          }
        }
      ]
    }

    // Add date filters
    if (startDate || endDate) {
      whereClause.startedAt = {}
      if (startDate) {
        whereClause.startedAt.gte = new Date(startDate)
      }
      if (endDate) {
        whereClause.startedAt.lte = new Date(endDate)
      }
    }

    const [workouts, total] = await Promise.all([
      prisma.workout.findMany({
        where: whereClause,
        include: {
          sets: {
            orderBy: [
              { exerciseId: 'asc' },
              { setNumber: 'asc' }
            ]
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { startedAt: 'desc' }
      }),
      prisma.workout.count({ where: whereClause })
    ])

    return successResponse(res, {
      workouts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Workouts retrieved successfully')
    
  } catch (error) {
    console.error('Get workouts error:', error)
    return errorResponse(res, 'Failed to retrieve workouts')
  }
})

// Get workout by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    
    const workout = await prisma.workout.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId // Ensure user owns the workout
      },
      include: {
        sets: {
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' }
          ]
        }
      }
    })

    if (!workout) {
      return errorResponse(res, 'Workout not found', 404)
    }

    return successResponse(res, workout, 'Workout retrieved successfully')
    
  } catch (error) {
    console.error('Get workout error:', error)
    return errorResponse(res, 'Failed to retrieve workout')
  }
})

// Create new workout
router.post('/', authenticateToken, validateCreateWorkout, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { 
      routineId, 
      routineName, 
      startedAt, 
      completedAt, 
      duration, 
      notes, 
      sets 
    } = req.body

    // Verify routine exists and belongs to user (optional validation)
    // Note: We trust the frontend to provide correct routine info
    
    // Validate that all sets have unique exercise+setNumber combinations
    const setKeys = sets.map(set => `${set.exerciseId}-${set.setNumber}`)
    const uniqueSetKeys = new Set(setKeys)
    if (setKeys.length !== uniqueSetKeys.size) {
      return errorResponse(res, 'Duplicate set numbers for the same exercise', 400)
    }

    // Create workout with sets in a transaction
    const workout = await prisma.$transaction(async (tx) => {
      // Create the workout
      const newWorkout = await tx.workout.create({
        data: {
          userId: req.user.userId,
          routineId,
          routineName,
          startedAt: new Date(startedAt),
          completedAt: completedAt ? new Date(completedAt) : null,
          duration,
          notes
        }
      })

      // Create workout sets
      await tx.workoutSet.createMany({
        data: sets.map(set => ({
          workoutId: newWorkout.id,
          exerciseId: set.exerciseId,
          exerciseName: set.exerciseName,
          setNumber: set.setNumber,
          weight: set.weight,
          reps: set.reps,
          technique: set.technique || 'normal',
          completedAt: set.completedAt ? new Date(set.completedAt) : new Date()
        }))
      })

      // Return workout with sets
      return await tx.workout.findUnique({
        where: { id: newWorkout.id },
        include: {
          sets: {
            orderBy: [
              { exerciseId: 'asc' },
              { setNumber: 'asc' }
            ]
          }
        }
      })
    })

    return successResponse(res, workout, 'Workout created successfully', 201)
    
  } catch (error) {
    console.error('Create workout error:', error)
    return errorResponse(res, 'Failed to create workout')
  }
})

// Update workout (mainly for adding notes or updating completion time)
router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params
    const { completedAt, duration, notes } = req.body

    // Check if workout exists and belongs to user
    const existingWorkout = await prisma.workout.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    })

    if (!existingWorkout) {
      return errorResponse(res, 'Workout not found', 404)
    }

    // Update workout
    const updatedWorkout = await prisma.workout.update({
      where: { id: parseInt(id) },
      data: {
        ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
        ...(duration !== undefined && { duration }),
        ...(notes !== undefined && { notes }),
        updatedAt: new Date()
      },
      include: {
        sets: {
          orderBy: [
            { exerciseId: 'asc' },
            { setNumber: 'asc' }
          ]
        }
      }
    })

    return successResponse(res, updatedWorkout, 'Workout updated successfully')
    
  } catch (error) {
    console.error('Update workout error:', error)
    return errorResponse(res, 'Failed to update workout')
  }
})

// Delete workout
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params

    // Check if workout exists and belongs to user
    const workout = await prisma.workout.findUnique({
      where: { 
        id: parseInt(id),
        userId: req.user.userId
      }
    })

    if (!workout) {
      return errorResponse(res, 'Workout not found', 404)
    }

    // Delete workout (sets will be deleted automatically due to CASCADE)
    await prisma.workout.delete({
      where: { id: parseInt(id) }
    })

    return successResponse(res, null, 'Workout deleted successfully')
    
  } catch (error) {
    console.error('Delete workout error:', error)
    return errorResponse(res, 'Failed to delete workout')
  }
})

// Get user workout statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query // days
    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    const [
      totalWorkouts,
      completedWorkouts,
      totalSets,
      totalReps,
      totalWeight,
      avgDuration,
      recentWorkouts
    ] = await Promise.all([
      // Total workouts
      prisma.workout.count({
        where: { userId: req.user.userId }
      }),
      // Completed workouts
      prisma.workout.count({
        where: { 
          userId: req.user.userId,
          completedAt: { not: null }
        }
      }),
      // Total sets
      prisma.workoutSet.count({
        where: {
          workout: {
            userId: req.user.userId
          }
        }
      }),
      // Total reps
      prisma.workoutSet.aggregate({
        where: {
          workout: {
            userId: req.user.userId
          }
        },
        _sum: {
          reps: true
        }
      }),
      // Total weight lifted
      prisma.workoutSet.aggregate({
        where: {
          workout: {
            userId: req.user.userId
          },
          weight: { not: null }
        },
        _sum: {
          weight: true
        }
      }),
      // Average duration
      prisma.workout.aggregate({
        where: {
          userId: req.user.userId,
          duration: { not: null }
        },
        _avg: {
          duration: true
        }
      }),
      // Recent workouts in period
      prisma.workout.count({
        where: {
          userId: req.user.userId,
          startedAt: { gte: startDate }
        }
      })
    ])

    return successResponse(res, {
      totalWorkouts,
      completedWorkouts,
      incompleteWorkouts: totalWorkouts - completedWorkouts,
      totalSets,
      totalReps: totalReps._sum.reps || 0,
      totalWeightLifted: totalWeight._sum.weight || 0,
      avgDurationMinutes: avgDuration._avg.duration ? Math.round(avgDuration._avg.duration / 60) : 0,
      recentWorkouts,
      period: `${periodDays} days`
    }, 'Workout statistics retrieved successfully')
    
  } catch (error) {
    console.error('Get workout stats error:', error)
    return errorResponse(res, 'Failed to get workout statistics')
  }
})

// Get workout summary by exercise
router.get('/stats/exercises', authenticateToken, async (req, res) => {
  try {
    const { period = '30' } = req.query
    const periodDays = parseInt(period)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - periodDays)

    const exerciseStats = await prisma.workoutSet.groupBy({
      by: ['exerciseId', 'exerciseName'],
      where: {
        workout: {
          userId: req.user.userId,
          startedAt: { gte: startDate }
        }
      },
      _count: {
        id: true
      },
      _sum: {
        reps: true,
        weight: true
      },
      _avg: {
        weight: true
      },
      _max: {
        weight: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    })

    const formattedStats = exerciseStats.map(stat => ({
      exerciseId: stat.exerciseId,
      exerciseName: stat.exerciseName,
      totalSets: stat._count.id,
      totalReps: stat._sum.reps || 0,
      totalWeight: stat._sum.weight || 0,
      avgWeight: stat._avg.weight ? parseFloat(stat._avg.weight.toFixed(2)) : 0,
      maxWeight: stat._max.weight || 0
    }))

    return successResponse(res, {
      exercises: formattedStats,
      period: `${periodDays} days`
    }, 'Exercise statistics retrieved successfully')
    
  } catch (error) {
    console.error('Get exercise stats error:', error)
    return errorResponse(res, 'Failed to get exercise statistics')
  }
})

// Get workout progress for specific exercise
router.get('/progress/:exerciseId', authenticateToken, async (req, res) => {
  try {
    const { exerciseId } = req.params
    const { limit = 10 } = req.query

    const progressData = await prisma.workoutSet.findMany({
      where: {
        exerciseId: parseInt(exerciseId),
        workout: {
          userId: req.user.userId,
          completedAt: { not: null }
        }
      },
      select: {
        weight: true,
        reps: true,
        completedAt: true,
        workout: {
          select: {
            startedAt: true,
            routineName: true
          }
        }
      },
      orderBy: { completedAt: 'desc' },
      take: parseInt(limit)
    })

    // Calculate progress metrics
    const progressMetrics = progressData.map(set => ({
      date: set.workout.startedAt,
      routineName: set.workout.routineName,
      weight: set.weight,
      reps: set.reps,
      volume: set.weight ? parseFloat((set.weight * set.reps).toFixed(2)) : 0
    }))

    return successResponse(res, {
      exerciseId: parseInt(exerciseId),
      progress: progressMetrics
    }, 'Exercise progress retrieved successfully')
    
  } catch (error) {
    console.error('Get exercise progress error:', error)
    return errorResponse(res, 'Failed to get exercise progress')
  }
})

// Get recent workouts (last 5)
router.get('/recent', authenticateToken, async (req, res) => {
  try {
    const recentWorkouts = await prisma.workout.findMany({
      where: { userId: req.user.userId },
      include: {
        sets: {
          select: {
            exerciseName: true,
            weight: true,
            reps: true
          }
        }
      },
      orderBy: { startedAt: 'desc' },
      take: 5
    })

    // Format for quick overview
    const formattedWorkouts = recentWorkouts.map(workout => ({
      id: workout.id,
      routineName: workout.routineName,
      startedAt: workout.startedAt,
      completedAt: workout.completedAt,
      duration: workout.duration,
      totalSets: workout.sets.length,
      exercises: [...new Set(workout.sets.map(set => set.exerciseName))],
      isCompleted: !!workout.completedAt
    }))

    return successResponse(res, formattedWorkouts, 'Recent workouts retrieved successfully')
    
  } catch (error) {
    console.error('Get recent workouts error:', error)
    return errorResponse(res, 'Failed to get recent workouts')
  }
})

// Health check with database status
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.workout.count()
    
    // Test Routine Service connection
    let routineServiceStatus = 'Connected'
    try {
      await routineService.verifyRoutine(1, 1) // Test call
    } catch (error) {
      routineServiceStatus = 'Disconnected'
    }

    // Test Exercise Service connection
    let exerciseServiceStatus = 'Connected'
    try {
      await exerciseService.verifyExercise(1) // Test call
    } catch (error) {
      exerciseServiceStatus = 'Disconnected'
    }
    
    return successResponse(res, {
      service: 'Workout Service',
      database: 'Connected',
      routineService: routineServiceStatus,
      exerciseService: exerciseServiceStatus,
      uptime: process.uptime()
    }, 'Service is healthy')
    
  } catch (error) {
    console.error('Health check error:', error)
    return res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      data: {
        service: 'Workout Service',
        database: 'Disconnected',
        uptime: process.uptime()
      }
    })
  }
})

module.exports = router