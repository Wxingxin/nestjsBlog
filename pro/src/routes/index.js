const express = require('express');
const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const postRoutes = require('./post.routes');
const commentRoutes = require('./comment.routes');
const { rateLimit } = require('../middlewares/rateLimit');

const router = express.Router();

// Apply a simple in-memory rate limit for all APIs
router.use(rateLimit);

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/posts', postRoutes);
router.use('/comments', commentRoutes);

module.exports = router;
