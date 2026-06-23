const express = require('express');
const notificationRoutes = require('./modules/notifications/notification.routes');

const router = express.Router();

router.use('/', notificationRoutes);

module.exports = router;
