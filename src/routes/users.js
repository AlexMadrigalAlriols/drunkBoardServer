const express = require('express');
const router = express.Router();
const { show } = require('../controllers/users.controller');

router.get('/:id', show);

module.exports = router;