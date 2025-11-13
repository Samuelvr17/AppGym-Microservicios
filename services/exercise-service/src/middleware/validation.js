const { body, query } = require('express-validator')

// Validation rules for creating exercises
const validateCreateExercise = [
  body('name')
    .isLength({ min: 2, max: 100 })
    .withMessage('Exercise name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('aliases')
    .optional()
    .isArray()
    .withMessage('Aliases must be an array'),
  body('aliases.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each alias must be between 1 and 100 characters')
    .trim()
]

// Validation rules for updating exercises
const validateUpdateExercise = [
  body('name')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('Exercise name must be between 2 and 100 characters')
    .trim(),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters')
    .trim(),
  body('aliases')
    .optional()
    .isArray()
    .withMessage('Aliases must be an array'),
  body('aliases.*')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Each alias must be between 1 and 100 characters')
    .trim()
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

const validateBatchRequest = [
  query('ids')
    .exists({ checkFalsy: true })
    .withMessage('ids query parameter is required')
    .bail()
    .custom(value => {
      const ids = value.split(',').map(id => id.trim())

      if (ids.length === 0) {
        throw new Error('At least one id must be provided')
      }

      const invalidId = ids.find(id => {
        const parsed = Number.parseInt(id, 10)
        return !Number.isInteger(parsed) || parsed <= 0
      })

      if (invalidId) {
        throw new Error('ids must be a comma-separated list of positive integers')
      }

      return true
    })
]

module.exports = {
  validateCreateExercise,
  validateUpdateExercise,
  validateSearch,
  validateBatchRequest
}
