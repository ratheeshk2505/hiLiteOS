-- Seed the master module catalog.
-- Add new rows here whenever a new feature module ships — organizations
-- can then have it enabled per-tenant with zero code changes.
INSERT INTO modules (key, name, description) VALUES
  ('sales_erp',     'Sales ERP',     'Leads, activities, pipeline and team management'),
  ('notifications', 'Notifications', 'Event-driven notifications for lead activity')
ON CONFLICT (key) DO NOTHING;

-- Seed one platform admin so you can log in immediately after migrating.
-- Email: admin@hilite.os   Password: ChangeMe123!
-- The hash below was generated with bcrypt (cost 10) for "ChangeMe123!".
-- CHANGE THIS PASSWORD before using this anywhere but local dev.
INSERT INTO platform_admins (name, email, password_hash) VALUES
  ('HiLITE Platform Admin', 'admin@hilite.os', '$2a$10$gf3uJeGu/DYNAJQmtD6Ax.uXab0EVc/GXN1aQGPZPL8aHgEMiKE92')
ON CONFLICT (email) DO NOTHING;
