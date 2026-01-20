function parsePagination(query) {
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 10);
  return { page, limit };
}

module.exports = { parsePagination };
