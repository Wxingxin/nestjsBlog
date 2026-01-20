const express = require('express');
const { login, register } = require('../controllers/auth.controller');
const { validateLogin, validateRegister } = require('../validators/auth.validator');

const router = express.Router();

// Auth endpoints
router.post('/login', validateLogin, login);
router.post('/register', validateRegister, register);

module.exports = router;
