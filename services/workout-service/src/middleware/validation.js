const { body, query } = require('express-validator')

// Validation rules for creating workouts
const validateCreateWorkout = [
  body('routineId')
    .isInt({ min: 1 })
    .withMessage('Routine ID must be a positive integer'),
  body('routineName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Routine name must be between 2 and 100 characters')
    .trim(),
  body('startedAt')
    .isISO8601()
    .withMessage('Started at must be a valid ISO 8601 date'),
  body('completedAt')
    .optional()
    .isISO8601()
    .withMessage('Completed at must be a valid ISO 8601 date'),
  body('duration')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Duration must be a positive integer (seconds)'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes must not exceed 1000 characters')
    .trim(),
  body('sets')
    .isArray({ min: 1 })
    .withMessage('Workout must have at least one set'),
  body('sets.*.exerciseId')
    .isInt({ min: 1 })
    .withMessage('Exercise ID must be a positive integer'),
  body('sets.*.exerciseName')
    .isLength({ min: 2, max: 100 })
    .withMessage('Exercise name must be between 2 and 100 characters')
    .trim(),
  body('sets.*.setNumber')
    .isInt({ min: 1 })
    .withMessage('Set number must be a positive integer'),
  body('sets.*.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('sets.*.reps')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Reps must be between 1 and 1000'),
  body('sets.*.technique')
    .optional()
    .isIn(['normal', 'dropset', 'myo-reps', 'failure', 'rest-pause'])
    .withMessage('Invalid technique')
]

// Validation rules for search
const validateSearch = [
  query('q')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
]

module.exports = {
  validateCreateWorkout,
  validateSearch
}