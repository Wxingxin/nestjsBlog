function upload(req, res, next) {
  // Placeholder upload handler without multipart parsing.
  if (req.body && req.body.file) {
    req.file = {
      name: req.body.fileName || 'upload.bin',
      size: String(req.body.file).length,
    };
  }
  next();
}

module.exports = { upload };
