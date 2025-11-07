const { body, query } = require('express-validator')

// Validation rules for creating routines
const validateCreateRoutine = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Routine name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('exercises')
    .isArray({ min: 1 })
    .withMessage('Routine must have at least one exercise'),
  body('exercises.*.exerciseId')
    .isInt({ min: 1 })
    .withMessage('Exercise ID must be a positive integer'),
  body('exercises.*.sets')
    .isInt({ min: 1, max: 20 })
    .withMessage('Sets must be between 1 and 20'),
  body('exercises.*.repRangeMin')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Minimum reps must be between 1 and 100'),
  body('exercises.*.repRangeMax')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Maximum reps must be between 1 and 100'),
  body('exercises.*.technique')
    .optional()
    .isIn(['normal', 'dropset', 'myo-reps', 'failure', 'rest-pause'])
    .withMessage('Invalid technique'),
  body('exercises.*.orderInRoutine')
    .isInt({ min: 1 })
    .withMessage('Order in routine must be a positive integer')
]

// Validation rules for updating routines
const validateUpdateRoutine = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Routine name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('exercises')
    .optional()
    .isArray({ min: 1 })
    .withMessage('Routine must have at least one exercise'),
  body('exercises.*.exerciseId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Exercise ID must be a positive integer'),
  body('exercises.*.sets')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Sets must be between 1 and 20'),
  body('exercises.*.repRangeMin')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Minimum reps must be between 1 and 100'),
  body('exercises.*.repRangeMax')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Maximum reps must be between 1 and 100'),
  body('exercises.*.technique')
    .optional()
    .isIn(['normal', 'dropset', 'myo-reps', 'failure', 'rest-pause'])
    .withMessage('Invalid technique'),
  body('exercises.*.orderInRoutine')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order in routine must be a positive integer')
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
    .withMessage('Limit must be between 1 and 100')
]

module.exports = {
  validateCreateRoutine,
  validateUpdateRoutine,
  validateSearch
}