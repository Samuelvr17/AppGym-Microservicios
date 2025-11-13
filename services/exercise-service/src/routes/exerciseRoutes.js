const express = require('express')
const { validationResult } = require('express-validator')
const { prisma } = require('../config/database')
const { authenticateToken, requireAdmin } = require('../middleware/auth')
const { validateCreateExercise, validateUpdateExercise, validateSearch, validateBatchRequest } = require('../middleware/validation')
const { uploadVideo, handleUploadError } = require('../middleware/upload')
const { successResponse, errorResponse, validationErrorResponse } = require('../utils/responseHelper')
const path = require('path')
const fs = require('fs')

const router = express.Router()

// Get all exercises with search functionality
router.get('/', validateSearch, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { q: searchQuery, page = 1, limit = 20 } = req.query
    const skip = (parseInt(page) - 1) * parseInt(limit)

    let whereClause = {}
    
    if (searchQuery) {
      whereClause = {
        OR: [
          {
            name: {
              contains: searchQuery,
              mode: 'insensitive'
            }
          },
          {
            aliases: {
              some: {
                alias: {
                  contains: searchQuery,
                  mode: 'insensitive'
                }
              }
            }
          }
        ]
      }
    }

    const [exercises, total] = await Promise.all([
      prisma.exercise.findMany({
        where: whereClause,
        include: {
          aliases: {
            select: {
              alias: true
            }
          }
        },
        skip,
        take: parseInt(limit),
        orderBy: { name: 'asc' }
      }),
      prisma.exercise.count({ where: whereClause })
    ])

    // Format response to include aliases as array of strings
    const formattedExercises = exercises.map(exercise => ({
      ...exercise,
      aliases: exercise.aliases.map(a => a.alias)
    }))

    return successResponse(res, {
      exercises: formattedExercises,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }, 'Exercises retrieved successfully')
    
  } catch (error) {
    console.error('Get exercises error:', error)
    return errorResponse(res, 'Failed to retrieve exercises')
  }
})

// Get multiple exercises by IDs
router.get('/batch', validateBatchRequest, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const idsParam = req.query.ids
    const idList = idsParam.split(',').map(id => parseInt(id, 10))
    const uniqueIds = Array.from(new Set(idList))

    const exercises = await prisma.exercise.findMany({
      where: { id: { in: uniqueIds } },
      include: {
        aliases: {
          select: {
            alias: true
          }
        }
      }
    })

    const exerciseMap = new Map(
      exercises.map(exercise => [
        exercise.id,
        {
          ...exercise,
          aliases: exercise.aliases.map(a => a.alias)
        }
      ])
    )

    const missingExerciseIds = uniqueIds.filter(id => !exerciseMap.has(id))

    const formattedExercises = uniqueIds
      .map(id => exerciseMap.get(id))
      .filter(Boolean)

    return successResponse(res, {
      exercises: formattedExercises,
      missingExerciseIds
    }, 'Exercises retrieved successfully')
  } catch (error) {
    console.error('Get exercises batch error:', error)
    return errorResponse(res, 'Failed to retrieve exercises')
  }
})

// Get exercise by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    
    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) },
      include: {
        aliases: {
          select: {
            alias: true
          }
        }
      }
    })

    if (!exercise) {
      return errorResponse(res, 'Exercise not found', 404)
    }

    // Format response to include aliases as array of strings
    const formattedExercise = {
      ...exercise,
      aliases: exercise.aliases.map(a => a.alias)
    }

    return successResponse(res, formattedExercise, 'Exercise retrieved successfully')
    
  } catch (error) {
    console.error('Get exercise error:', error)
    return errorResponse(res, 'Failed to retrieve exercise')
  }
})

// Create new exercise (admin only)
router.post('/', authenticateToken, requireAdmin, validateCreateExercise, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { name, description, aliases = [] } = req.body

    // Check if exercise with same name already exists
    const existingExercise = await prisma.exercise.findFirst({
      where: {
        name: {
          equals: name,
          mode: 'insensitive'
        }
      }
    })

    if (existingExercise) {
      return errorResponse(res, 'Exercise with this name already exists', 400)
    }

    // Create exercise with aliases in a transaction
    const exercise = await prisma.$transaction(async (tx) => {
      // Create the exercise
      const newExercise = await tx.exercise.create({
        data: {
          name,
          description,
          createdBy: req.user.userId
        }
      })

      // Create aliases if provided
      if (aliases.length > 0) {
        await tx.exerciseAlias.createMany({
          data: aliases.map(alias => ({
            exerciseId: newExercise.id,
            alias: alias.trim()
          }))
        })
      }

      // Return exercise with aliases
      return await tx.exercise.findUnique({
        where: { id: newExercise.id },
        include: {
          aliases: {
            select: {
              alias: true
            }
          }
        }
      })
    })

    // Format response
    const formattedExercise = {
      ...exercise,
      aliases: exercise.aliases.map(a => a.alias)
    }

    return successResponse(res, formattedExercise, 'Exercise created successfully', 201)
    
  } catch (error) {
    console.error('Create exercise error:', error)
    return errorResponse(res, 'Failed to create exercise')
  }
})

// Update exercise (admin only)
router.put('/:id', authenticateToken, requireAdmin, validateUpdateExercise, async (req, res) => {
  try {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return validationErrorResponse(res, errors)
    }

    const { id } = req.params
    const { name, description, aliases } = req.body

    // Check if exercise exists
    const existingExercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) }
    })

    if (!existingExercise) {
      return errorResponse(res, 'Exercise not found', 404)
    }

    // Check if new name conflicts with existing exercise (if name is being updated)
    if (name && name !== existingExercise.name) {
      const nameConflict = await prisma.exercise.findFirst({
        where: {
          name: {
            equals: name,
            mode: 'insensitive'
          },
          id: {
            not: parseInt(id)
          }
        }
      })

      if (nameConflict) {
        return errorResponse(res, 'Exercise with this name already exists', 400)
      }
    }

    // Update exercise with aliases in a transaction
    const updatedExercise = await prisma.$transaction(async (tx) => {
      // Update the exercise
      const exercise = await tx.exercise.update({
        where: { id: parseInt(id) },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description }),
          updatedAt: new Date()
        }
      })

      // Update aliases if provided
      if (aliases !== undefined) {
        // Delete existing aliases
        await tx.exerciseAlias.deleteMany({
          where: { exerciseId: parseInt(id) }
        })

        // Create new aliases
        if (aliases.length > 0) {
          await tx.exerciseAlias.createMany({
            data: aliases.map(alias => ({
              exerciseId: parseInt(id),
              alias: alias.trim()
            }))
          })
        }
      }

      // Return updated exercise with aliases
      return await tx.exercise.findUnique({
        where: { id: parseInt(id) },
        include: {
          aliases: {
            select: {
              alias: true
            }
          }
        }
      })
    })

    // Format response
    const formattedExercise = {
      ...updatedExercise,
      aliases: updatedExercise.aliases.map(a => a.alias)
    }

    return successResponse(res, formattedExercise, 'Exercise updated successfully')
    
  } catch (error) {
    console.error('Update exercise error:', error)
    return errorResponse(res, 'Failed to update exercise')
  }
})

// Delete exercise (admin only)
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) }
    })

    if (!exercise) {
      return errorResponse(res, 'Exercise not found', 404)
    }

    // Delete video file if exists
    if (exercise.videoPath) {
      const videoPath = path.join(__dirname, '../../uploads', path.basename(exercise.videoPath))
      if (fs.existsSync(videoPath)) {
        fs.unlinkSync(videoPath)
      }
    }

    // Delete exercise (aliases will be deleted automatically due to CASCADE)
    await prisma.exercise.delete({
      where: { id: parseInt(id) }
    })

    return successResponse(res, null, 'Exercise deleted successfully')
    
  } catch (error) {
    console.error('Delete exercise error:', error)
    return errorResponse(res, 'Failed to delete exercise')
  }
})

// Upload video for exercise (admin only)
router.post('/:id/video', authenticateToken, requireAdmin, uploadVideo, handleUploadError, async (req, res) => {
  try {
    const { id } = req.params

    if (!req.file) {
      return errorResponse(res, 'No video file provided', 400)
    }

    // Check if exercise exists
    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) }
    })

    if (!exercise) {
      // Delete uploaded file if exercise doesn't exist
      fs.unlinkSync(req.file.path)
      return errorResponse(res, 'Exercise not found', 404)
    }

    // Delete old video if exists
    if (exercise.videoPath) {
      const oldVideoPath = path.join(__dirname, '../../uploads', path.basename(exercise.videoPath))
      if (fs.existsSync(oldVideoPath)) {
        fs.unlinkSync(oldVideoPath)
      }
    }

    // Update exercise with new video path
    const videoPath = `/uploads/${req.file.filename}`
    const updatedExercise = await prisma.exercise.update({
      where: { id: parseInt(id) },
      data: {
        videoPath,
        updatedAt: new Date()
      },
      include: {
        aliases: {
          select: {
            alias: true
          }
        }
      }
    })

    // Format response
    const formattedExercise = {
      ...updatedExercise,
      aliases: updatedExercise.aliases.map(a => a.alias)
    }

    return successResponse(res, formattedExercise, 'Video uploaded successfully')
    
  } catch (error) {
    console.error('Upload video error:', error)
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path)
    }
    return errorResponse(res, 'Failed to upload video')
  }
})

// Get video for exercise
router.get('/:id/video', async (req, res) => {
  try {
    const { id } = req.params

    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) },
      select: { videoPath: true }
    })

    if (!exercise) {
      return errorResponse(res, 'Exercise not found', 404)
    }

    if (!exercise.videoPath) {
      return errorResponse(res, 'No video available for this exercise', 404)
    }

    const videoPath = path.join(__dirname, '../../uploads', path.basename(exercise.videoPath))
    
    if (!fs.existsSync(videoPath)) {
      return errorResponse(res, 'Video file not found', 404)
    }

    // Get file stats for content length
    const stat = fs.statSync(videoPath)
    const fileSize = stat.size
    const range = req.headers.range

    if (range) {
      // Handle range requests for video streaming
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1
      const chunksize = (end - start) + 1
      const file = fs.createReadStream(videoPath, { start, end })
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(206, head)
      file.pipe(res)
    } else {
      // Send entire file
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(200, head)
      fs.createReadStream(videoPath).pipe(res)
    }
    
  } catch (error) {
    console.error('Get video error:', error)
    return errorResponse(res, 'Failed to retrieve video')
  }
})

// Delete video for exercise (admin only)
router.delete('/:id/video', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params

    const exercise = await prisma.exercise.findUnique({
      where: { id: parseInt(id) }
    })

    if (!exercise) {
      return errorResponse(res, 'Exercise not found', 404)
    }

    if (!exercise.videoPath) {
      return errorResponse(res, 'No video to delete', 404)
    }

    // Delete video file
    const videoPath = path.join(__dirname, '../../uploads', path.basename(exercise.videoPath))
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath)
    }

    // Update exercise to remove video path
    await prisma.exercise.update({
      where: { id: parseInt(id) },
      data: {
        videoPath: null,
        updatedAt: new Date()
      }
    })

    return successResponse(res, null, 'Video deleted successfully')
    
  } catch (error) {
    console.error('Delete video error:', error)
    return errorResponse(res, 'Failed to delete video')
  }
})

// Get exercise statistics (admin only)
router.get('/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const [totalExercises, exercisesWithVideos, totalAliases] = await Promise.all([
      prisma.exercise.count(),
      prisma.exercise.count({
        where: {
          videoPath: {
            not: null
          }
        }
      }),
      prisma.exerciseAlias.count()
    ])

    return successResponse(res, {
      totalExercises,
      exercisesWithVideos,
      exercisesWithoutVideos: totalExercises - exercisesWithVideos,
      totalAliases,
      averageAliasesPerExercise: totalExercises > 0 ? (totalAliases / totalExercises).toFixed(2) : 0
    }, 'Exercise statistics retrieved successfully')
    
  } catch (error) {
    console.error('Get exercise stats error:', error)
    return errorResponse(res, 'Failed to get exercise statistics')
  }
})

// Health check with database status
router.get('/health', async (req, res) => {
  try {
    // Test database connection
    await prisma.exercise.count()
    
    return successResponse(res, {
      service: 'Exercise Service',
      database: 'Connected',
      uptime: process.uptime(),
      uploadsDirectory: fs.existsSync(path.join(__dirname, '../../uploads')) ? 'Available' : 'Missing'
    }, 'Service is healthy')
    
  } catch (error) {
    console.error('Health check error:', error)
    return res.status(503).json({
      success: false,
      message: 'Service unhealthy',
      data: {
        service: 'Exercise Service',
        database: 'Disconnected',
        uptime: process.uptime()
      }
    })
  }
})

module.exports = router