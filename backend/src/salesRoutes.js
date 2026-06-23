const express = require('express');
const leadRoutes = require('./modules/leads/lead.routes');

const router = express.Router();

router.use('/leads', leadRoutes);

module.exports = router;
