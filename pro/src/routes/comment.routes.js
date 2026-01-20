const express = require('express');
const { addComment } = require('../controllers/comment.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// Comment creation
router.post('/', requireAuth, addComment);

module.exports = router;
