const express = require('express');
const controller = require('./lead.controller');
const { requireOrgUser } = require('../../middleware/orgAuth');

const router = express.Router();

// Unlike Module 2, this is NOT admin-only — every org user (Executive,
// Team Lead, Director, ...) needs access to manage leads. What each of
// them can see/do is enforced per-request inside the service layer based
// on their role's data_scope, not by a blanket middleware check here.
router.use(requireOrgUser);

router.post('/', controller.create);
router.get('/', controller.list);
router.get('/assignable-users', controller.listAssignableUsers);
router.get('/:id', controller.getById);
router.patch('/:id', controller.update);
router.patch('/:id/status', controller.updateStatus);
router.patch('/:id/assign', controller.assign);
router.post('/:id/activities', controller.createActivity);
router.get('/:id/activities', controller.listActivities);

module.exports = router;
