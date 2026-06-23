import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Spinner } from '../../../components/ui/Spinner';
import { Pill } from '../../../components/ui/Pill';
import { dashboardApi } from '../api/dashboardApi';
import { getErrorMessage } from '../api/apiClient';
import { statusLabel, statusTone, activityTypeLabel } from '../constants/leadStatus';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    dashboardApi
      .getSummary()
      .then(setSummary)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <AppShell title="Dashboard">
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-slate" />
        </div>
      </AppShell>
    );
  }

  if (error || !summary) {
    return (
      <AppShell title="Dashboard">
        <div className="rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error || 'Could not load dashboard'}</div>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard">
      <PersonalSection personal={summary.personal} />

      {summary.scope === 'team' && <TeamSection leaderboard={summary.team.leaderboard} />}
      {summary.scope === 'organization' && <OrganizationSection organization={summary.organization} />}
    </AppShell>
  );
}

function StatCard({ label, value, tone }) {
  const toneClass = tone === 'verdant' ? 'text-verdant' : tone === 'ember' ? 'text-ember' : 'text-ink';
  return (
    <div className="rounded-xl border border-line bg-paper-raised px-5 py-4">
      <div className="text-xs uppercase tracking-wide text-slate">{label}</div>
      <div className={`mt-1 font-display text-3xl ${toneClass}`}>{value}</div>
    </div>
  );
}

function PersonalSection({ personal }) {
  return (
    <section>
      <h2 className="font-display text-lg text-ink">Your performance</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Your leads" value={personal.total_leads} />
        <StatCard label="Won" value={personal.won_leads} tone="verdant" />
        <StatCard label="Conversion rate" value={`${personal.conversion_rate}%`} />
        <StatCard label="Activities (30d)" value={personal.activities.last_30_days} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <h3 className="text-sm font-medium text-ink">Recent leads</h3>
          {personal.recentLeads.length === 0 ? (
            <p className="mt-2 text-sm text-slate">No leads yet.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {personal.recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center justify-between">
                  <Link to={`/org/leads/${lead.id}`} className="text-sm font-medium text-ink hover:underline">
                    {lead.name}
                  </Link>
                  <Pill label={statusLabel(lead.status)} tone={statusTone(lead.status)} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-line bg-paper-raised p-5">
          <h3 className="text-sm font-medium text-ink">Recent activity</h3>
          {personal.recentActivities.length === 0 ? (
            <p className="mt-2 text-sm text-slate">No activity logged yet.</p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {personal.recentActivities.map((a) => (
                <div key={a.id} className="flex items-center justify-between">
                  <div>
                    <Link to={`/org/leads/${a.lead_id}`} className="text-sm font-medium text-ink hover:underline">
                      {a.lead_name}
                    </Link>
                    <span className="ml-2 text-xs text-slate">{activityTypeLabel(a.type)}</span>
                  </div>
                  <span className="text-xs text-slate">{new Date(a.occurred_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function TeamSection({ leaderboard }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-ink">Team leaderboard</h2>
      <p className="mt-0.5 text-sm text-slate">Everyone on your team, ranked by leads won.</p>

      <div className="mt-3 overflow-hidden rounded-xl border border-line bg-paper-raised">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
            <tr>
              <th className="px-5 py-3 font-medium">Name</th>
              <th className="px-5 py-3 font-medium">Leads</th>
              <th className="px-5 py-3 font-medium">Won</th>
              <th className="px-5 py-3 font-medium">Conversion</th>
              <th className="px-5 py-3 font-medium">Activities</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((row) => (
              <tr key={row.id} className="border-b border-line last:border-0">
                <td className="px-5 py-3.5 font-medium text-ink">{row.name}</td>
                <td className="px-5 py-3.5 text-slate">{row.total_leads}</td>
                <td className="px-5 py-3.5 text-slate">{row.won_leads}</td>
                <td className="px-5 py-3.5 text-slate">{row.conversion_rate}%</td>
                <td className="px-5 py-3.5 text-slate">{row.activity_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </section>
  );
}

function OrganizationSection({ organization }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-lg text-ink">Organization overview</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total leads" value={organization.total_leads} />
        <StatCard label="Won" value={organization.won_leads} tone="verdant" />
        <StatCard label="Conversion rate" value={`${organization.conversion_rate}%`} />
        <StatCard label="Total activities" value={organization.totalActivities} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeaderboardCard title="Top teams" rows={organization.topTeams} subKey={null} />
        <LeaderboardCard title="Top executives" rows={organization.topExecutives} subKey="team_name" />
      </div>
    </section>
  );
}

function LeaderboardCard({ title, rows, subKey }) {
  return (
    <div className="rounded-xl border border-line bg-paper-raised p-5">
      <h3 className="text-sm font-medium text-ink">{title}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-slate">Nothing to show yet.</p>
      ) : (
        <div className="mt-3 space-y-2.5">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-ink">{row.name}</div>
                {subKey && row[subKey] && <div className="text-xs text-slate">{row[subKey]}</div>}
              </div>
              <div className="text-right text-sm text-slate">
                {row.won_leads}/{row.total_leads} won <span className="text-xs">({row.conversion_rate}%)</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
