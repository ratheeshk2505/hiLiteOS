const express = require('express');
const orgAuthRoutes = require('./modules/orgAuth/orgAuth.routes');
const teamRoutes = require('./modules/teams/team.routes');
const roleRoutes = require('./modules/roles/role.routes');
const orgUserRoutes = require('./modules/orgUsers/orgUser.routes');
const orgModuleRoutes = require('./modules/orgModules/orgModule.routes');

const router = express.Router();

// /api/org/auth/*    -> tenant user login (organization code + email + password)
// /api/org/teams/*   -> team management (admin-only)
// /api/org/roles/*   -> role management (admin-only)
// /api/org/users/*   -> user creation, team/role assignment, activation (admin-only)
// /api/org/modules/* -> read-only visibility into this org's enabled modules (admin-only,
//                       no write routes — enablement stays a platform-only decision)
router.use('/auth', orgAuthRoutes);
router.use('/teams', teamRoutes);
router.use('/roles', roleRoutes);
router.use('/users', orgUserRoutes);
router.use('/modules', orgModuleRoutes);

module.exports = router;
