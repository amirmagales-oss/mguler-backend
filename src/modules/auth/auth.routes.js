const express = require('express');
const controller = require('./auth.controller');
const { requireAuth } = require('../../shared/middlewares/require-auth');
const { loginRateLimit } = require('../../shared/middlewares/login-rate-limit');

const router = express.Router();

router.post('/login', loginRateLimit, controller.login);
router.post('/refresh', controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', requireAuth, controller.me);

module.exports = router;
