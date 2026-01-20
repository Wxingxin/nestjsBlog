const express = require('express');
const { listPosts, createPost } = require('../controllers/post.controller');
const { requireAuth } = require('../middlewares/auth.middleware');
const { validateCreatePost } = require('../validators/post.validator');

const router = express.Router();

// Post listing and creation
router.get('/', listPosts);
router.post('/', requireAuth, validateCreatePost, createPost);

module.exports = router;
