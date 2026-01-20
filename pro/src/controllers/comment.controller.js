const commentService = require('../services/comment.service');

async function addComment(req, res, next) {
  try {
    // req.user is populated by auth middleware
    const result = await commentService.addComment(req.user, req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { addComment };
