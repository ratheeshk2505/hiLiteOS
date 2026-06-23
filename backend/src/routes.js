const express = require('express');
const platformAdminRoutes = require('./modules/platformAdmin/platformAdmin.routes');
const organizationRoutes = require('./modules/organizations/organization.routes');
const modulesCatalogRoutes = require('./modules/modulesCatalog/modulesCatalog.routes');

const router = express.Router();

// /api/platform/auth/*      -> platform admin login
// /api/platform/organizations/* -> organization CRUD, status, module toggles
// /api/platform/modules/*   -> master module catalog (read-only)
router.use('/auth', platformAdminRoutes);
router.use('/organizations', organizationRoutes);
router.use('/modules', modulesCatalogRoutes);

module.exports = router;
