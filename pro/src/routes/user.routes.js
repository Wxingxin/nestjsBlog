const express = require('express');
const { getProfile } = require('../controllers/user.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Current user profile
router.get('/me', requireAuth, getProfile);

module.exports = router;
