const express = require('express');
const router = express.Router();

const {
  createRequest,
  getRequests,
  canHelp,
  markCompleted,
  getRequestById,
  updateRequest,
  deleteRequest,
} = require('../controllers/request.controller');

const { protect } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');

const { createRequestSchema } = require('../validators/request.validator');

// Create request
router.post('/', protect, validate(createRequestSchema), createRequest);

// View & filter requests
// Read
router.get('/', protect, getRequests);
router.get('/:id', protect, getRequestById);

// Update
router.put('/:id', protect, validate(createRequestSchema), updateRequest);

// Delete
router.delete('/:id', protect, deleteRequest);

// I can help
router.post('/:id/help', protect, canHelp);

// Mark as solved
router.put('/:id/complete', protect, markCompleted);

module.exports = router;