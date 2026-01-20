const { VALIDATION } = require('../constants/errorCodes');

const store = {
  users: [],
  posts: [],
  comments: [],
};

const counters = {
  user: 1,
  post: 1,
  comment: 1,
};

function createError(message, status, code = VALIDATION) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

function toPublicUser(user) {
  if (!user) return null;
  const { passwordHash, ...rest } = user;
  return rest;
}

function createUser({ email, passwordHash, name }) {
  if (!email || !passwordHash) {
    throw createError('Email and password are required', 400);
  }
  const exists = store.users.find((u) => u.email === email);
  if (exists) {
    throw createError('Email already in use', 409);
  }
  const user = {
    id: String(counters.user++),
    email,
    name: name || 'new user',
    passwordHash,
    createdAt: new Date().toISOString(),
  };
  store.users.push(user);
  return toPublicUser(user);
}

function findUserByEmail(email) {
  return store.users.find((u) => u.email === email) || null;
}

function findUserById(id) {
  return store.users.find((u) => u.id === id) || null;
}

function createPost({ authorId, title, content }) {
  if (!authorId || !title) {
    throw createError('Author and title are required', 400);
  }
  const post = {
    id: String(counters.post++),
    authorId,
    title,
    content: content || '',
    createdAt: new Date().toISOString(),
  };
  store.posts.push(post);
  return post;
}

function findPostById(id) {
  return store.posts.find((p) => p.id === id) || null;
}

function listPosts({ offset, limit }) {
  const total = store.posts.length;
  const items = store.posts.slice(offset, offset + limit);
  return { items, total };
}

function createComment({ authorId, postId, content }) {
  if (!authorId || !postId || !content) {
    throw createError('Author, postId, and content are required', 400);
  }
  const comment = {
    id: String(counters.comment++),
    authorId,
    postId,
    content,
    createdAt: new Date().toISOString(),
  };
  store.comments.push(comment);
  return comment;
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  createPost,
  findPostById,
  listPosts,
  createComment,
  toPublicUser,
};
