const { UNAUTHORIZED, VALIDATION } = require('../constants/errorCodes');
const { createComment, findPostById } = require('./_store');

function createError(message, status, code = VALIDATION) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function addComment(user, payload) {
  if (!user || !user.id) {
    throw createError('Unauthorized', 401, UNAUTHORIZED);
  }
  const { postId, content } = payload || {};
  if (!postId || !content) {
    throw createError('postId and content are required', 400);
  }
  const post = findPostById(postId);
  if (!post) {
    throw createError('Post not found', 404);
  }
  return createComment({
    authorId: user.id,
    postId,
    content,
  });
}

module.exports = { addComment };
