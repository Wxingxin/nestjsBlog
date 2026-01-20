const { UNAUTHORIZED } = require('../constants/errorCodes');
const { parsePagination } = require('../utils/pagination');
const { createPost, listPosts } = require('./_store');

function createError(message, status, code) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

async function listPostsService(query) {
  const { page, limit } = parsePagination(query || {});
  const offset = (page - 1) * limit;
  const result = listPosts({ offset, limit });
  return {
    items: result.items,
    total: result.total,
    page,
    limit,
  };
}

async function createPostService(user, payload) {
  if (!user || !user.id) {
    throw createError('Unauthorized', 401, UNAUTHORIZED);
  }
  const { title, content } = payload || {};
  const post = createPost({
    authorId: user.id,
    title,
    content,
  });
  return post;
}

module.exports = {
  listPosts: listPostsService,
  createPost: createPostService,
};
