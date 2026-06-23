const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const compression = require('compression');
const env = require('./config/env');
const platformRoutes = require('./routes');
const orgRoutes = require('./orgRoutes');
const salesRoutes = require('./salesRoutes');
const dashboardRoutes = require('./dashboardRoutes');
const notificationRoutes = require('./notificationRoutes');
const { apiLimiter } = require('./middleware/rateLimit');
const { errorHandler, notFound } = require('./middleware/error');

const app = express();

// Sets a sane set of security headers (HSTS, no-sniff, frame-deny, etc.)
// in one line. crossOriginResourcePolicy is relaxed to 'cross-origin'
// because this API is deliberately consumed from a different origin (the
// React app on its own port/domain) — the default 'same-origin' value
// would otherwise block the frontend from reading these responses.
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(compression());

app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json());
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Global abuse backstop. Login endpoints layer a much tighter limiter on
// top of this (see middleware/rateLimit.js), applied at the route level.
app.use(apiLimiter);

app.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

// Module 1 (Platform Administration): platform-admin-only, manages tenants.
app.use('/api/platform', platformRoutes);

// Module 2 (Organization Administration): tenant-scoped, org-admin-only.
// Every route here authenticates via requireOrgUser/requireOrgAdmin and
// scopes its queries to req.orgUser.organizationId from the JWT.
app.use('/api/org', orgRoutes);

// Module 3 (Sales Management): tenant-scoped, open to any org user — what
// each person can see is enforced inside the service layer by their
// role's data_scope (own/team/organization), not by route-level gating.
app.use('/api/sales', salesRoutes);

// Module 4 (Dashboard & Analytics): same data_scope mechanism as Module 3,
// applied to aggregate metrics instead of individual lead records.
app.use('/api/dashboard', dashboardRoutes);

// Module 5 (Notifications): has no dependency on Module 3 at the code
// level — it only subscribes to events Module 3 publishes (see
// notification.events.js), registered once at startup in server.js.
app.use('/api/notifications', notificationRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
