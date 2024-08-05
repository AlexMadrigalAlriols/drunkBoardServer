const express = require('express');
const router = express.Router();
const usersRoutes = require('./users');
const authRoutes = require('./auth');
const authMiddleware = require('../middleware/auth');

// Asocia las rutas específicas a sus archivos correspondientes
router.use('/users', authMiddleware, usersRoutes);
router.use('/auth', authRoutes);

module.exports = router;