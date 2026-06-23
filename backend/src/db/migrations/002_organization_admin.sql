-- HiLITE Sales OS — Module 2: Organization Administration
--
-- Module 1 gave `users.role` a fixed enum (org_admin, director, team_lead,
-- sales_manager, executive). The assessment explicitly leaves role
-- implementation to the candidate, and Module 2 requires organization
-- admins to "create and manage roles" — a fixed enum can't do that. So
-- this migration replaces the enum with a per-organization `roles` table:
-- every org gets its own editable list of roles, seeded with the four
-- suggested defaults, and can add more without touching any code.
--
-- "Org Admin" stops being a role in that list and becomes a privilege
-- flag (`is_org_admin`) instead — it's an administrative permission, not
-- a position in the sales hierarchy, so it doesn't belong alongside
-- Executive/Team Lead/Sales Manager/Director.

CREATE TABLE IF NOT EXISTS teams (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

CREATE TABLE IF NOT EXISTS roles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  is_default      BOOLEAN NOT NULL DEFAULT false, -- seeded defaults can't be deleted, only renamed
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, name)
);

-- Backfill the four suggested default roles for every organization that
-- was already created before this migration ran.
INSERT INTO roles (organization_id, name, is_default)
SELECT o.id, r.name, true
FROM organizations o
CROSS JOIN (VALUES ('Executive'), ('Team Lead'), ('Sales Manager'), ('Director')) AS r(name)
ON CONFLICT (organization_id, name) DO NOTHING;

ALTER TABLE users ADD COLUMN IF NOT EXISTS is_org_admin BOOLEAN NOT NULL DEFAULT false;
UPDATE users SET is_org_admin = true WHERE role = 'org_admin';

ALTER TABLE users ADD COLUMN IF NOT EXISTS role_id UUID REFERENCES roles(id) ON DELETE SET NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES teams(id) ON DELETE SET NULL;

ALTER TABLE users DROP COLUMN IF EXISTS role;
DROP TYPE IF EXISTS user_role;

CREATE INDEX IF NOT EXISTS idx_teams_organization_id ON teams(organization_id);
CREATE INDEX IF NOT EXISTS idx_roles_organization_id ON roles(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id);
CREATE INDEX IF NOT EXISTS idx_users_team_id ON users(team_id);
