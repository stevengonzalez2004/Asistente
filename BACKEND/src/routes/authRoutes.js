const express = require('express');
const router = express.Router();
const authController = require('../controllers/authControllers');

router.post('/login', authController.login);
router.post('/register', authController.registroPublico);
router.post('/registro', authController.registroPublico);

module.exports = router;
