const express = require('express');
const dashboardRoutes = require('./modules/dashboard/dashboard.routes');

const router = express.Router();

router.use('/', dashboardRoutes);

module.exports = router;
