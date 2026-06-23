const express = require('express');
const controller = require('./dashboard.controller');
const { requireOrgUser } = require('../../middleware/orgAuth');

const router = express.Router();

// Open to any org user, same as Module 3 — the response shape itself
// changes based on the caller's data_scope rather than the route being
// gated to admins.
router.use(requireOrgUser);

router.get('/summary', controller.getSummary);

module.exports = router;
