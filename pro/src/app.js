const express = require('express');
const routes = require('./routes');
const { errorHandler } = require('./middlewares/error.middleware');

const app = express();

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api', routes);

// Global error handler
app.use(errorHandler);

module.exports = app;
