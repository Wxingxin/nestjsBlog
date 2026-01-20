const postService = require('../services/post.service');

async function listPosts(req, res, next) {
  try {
    const result = await postService.listPosts(req.query);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

async function createPost(req, res, next) {
  try {
    // req.user is populated by auth middleware
    const result = await postService.createPost(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { listPosts, createPost };
