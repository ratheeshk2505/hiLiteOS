-- HiLITE Sales OS — Platform Administration schema
-- Run this once against your Neon database (see scripts/migrate.js)

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gives us gen_random_uuid()

-- ---------------------------------------------------------------------------
-- platform_admins: super-admins who manage the whole HiLITE OS platform.
-- These are NOT tenant users — they sit above every organization.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS platform_admins (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  email         VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- modules: master catalog of feature modules that exist on the platform.
-- Organizations don't get rows here — they get rows in organization_modules.
-- This table is what lets platform admins enable/disable modules per org
-- without any code changes (Module Enablement requirement).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS modules (
  id          SERIAL PRIMARY KEY,
  key         VARCHAR(50) UNIQUE NOT NULL,   -- e.g. 'sales_erp', 'notifications'
  name        VARCHAR(100) NOT NULL,         -- e.g. 'Sales ERP'
  description TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- organizations: one row per tenant.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE organization_status AS ENUM ('active', 'suspended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS organizations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(150) NOT NULL,
  code        VARCHAR(50) UNIQUE NOT NULL,   -- short slug used in URLs/headers, e.g. 'hilite-builders'
  logo_url    TEXT,
  description TEXT,
  status      organization_status NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- organization_modules: join table — which modules are switched on per org.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organization_modules (
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  module_id        INT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
  enabled          BOOLEAN NOT NULL DEFAULT true,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, module_id)
);

-- ---------------------------------------------------------------------------
-- users: tenant-scoped users. Every row belongs to exactly one organization —
-- this is the column every future query in the app will filter on for
-- tenant isolation. Role management (Module 2) will extend this table later;
-- for Module 1 we only need enough to create the org's first admin.
-- ---------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE user_role AS ENUM ('org_admin', 'director', 'team_lead', 'sales_manager', 'executive');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  email           VARCHAR(150) NOT NULL,
  password_hash   VARCHAR(255),
  role            user_role NOT NULL DEFAULT 'org_admin',
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_organization_id ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_organization_modules_org_id ON organization_modules(organization_id);
