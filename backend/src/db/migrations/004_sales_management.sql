-- HiLITE Sales OS — Module 3: Sales Management
--
-- Security & Permissions in the assessment describes three access levels
-- (Executive: own leads only, Team Lead: team data, Director: org-wide).
-- Roles are an admin-editable per-organization table (Module 2), so
-- basing permissions on a role's *name* would break the moment an admin
-- renames "Director" to something else, or invents a new role that should
-- behave like one of these tiers. data_scope decouples the permission
-- from the label: every role explicitly declares how much lead data its
-- holders can see, independent of what it's called.

DO $$ BEGIN
  CREATE TYPE data_scope AS ENUM ('own', 'team', 'organization');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE roles ADD COLUMN IF NOT EXISTS data_scope data_scope NOT NULL DEFAULT 'own';

-- Defaults seeded in Module 2 didn't have a scope opinion yet — give them
-- sensible ones now, matching the assessment's suggested hierarchy.
UPDATE roles SET data_scope = 'own' WHERE name = 'Executive';
UPDATE roles SET data_scope = 'team' WHERE name IN ('Team Lead', 'Sales Manager');
UPDATE roles SET data_scope = 'organization' WHERE name = 'Director';

DO $$ BEGIN
  CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'visit_scheduled', 'site_visit_completed', 'negotiation', 'won', 'lost');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            VARCHAR(150) NOT NULL,
  mobile_number   VARCHAR(20) NOT NULL,
  email           VARCHAR(150),
  source          VARCHAR(100),
  project         VARCHAR(150),
  status          lead_status NOT NULL DEFAULT 'new',
  assigned_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_by_id   UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hot query patterns this module will run constantly: "my leads" (own
-- scope), "my team's leads" (team scope via a join to users), "all leads
-- in status X" (pipeline views), and "leads for organization Y" underlies
-- every single one of those. Composite indexes match the actual WHERE
-- clauses the service layer issues rather than indexing columns in
-- isolation.
CREATE INDEX IF NOT EXISTS idx_leads_org_assigned ON leads(organization_id, assigned_user_id);
CREATE INDEX IF NOT EXISTS idx_leads_org_status ON leads(organization_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_org_created_at ON leads(organization_id, created_at DESC);

-- "Lead status changes should be tracked" — a dedicated history table
-- rather than overwriting status in place, so the full pipeline timeline
-- survives and can support an audit/activity-feed view later.
CREATE TABLE IF NOT EXISTS lead_status_history (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  from_status lead_status,
  to_status   lead_status NOT NULL,
  changed_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lead_status_history_lead_id ON lead_status_history(lead_id, created_at DESC);

DO $$ BEGIN
  CREATE TYPE activity_type AS ENUM ('phone_call', 'meeting', 'site_visit', 'virtual_meeting');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id     UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type        activity_type NOT NULL,
  notes       TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activities_lead_id ON activities(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_activities_org_id ON activities(organization_id);
