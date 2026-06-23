import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Pagination } from '../../../components/ui/Pagination';
import { platformApi } from '../api/platformApi';
import { getErrorMessage } from '../api/apiClient';

export default function OrganizationsList() {
  const [organizations, setOrganizations] = useState([]);
  const [meta, setMeta] = useState(null);
  const [stats, setStats] = useState({ active: null, suspended: null });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  async function fetchOrganizations() {
    setIsLoading(true);
    setError('');
    try {
      // The list itself is paginated, so the "Active"/"Suspended" stat
      // cards can't be derived from the current page alone — a cheap
      // pageSize=1 request per status gets an accurate org-wide count
      // from its `meta.total` without pulling every row down.
      const [page1, activeCount, suspendedCount] = await Promise.all([
        platformApi.listOrganizations({ search: search || undefined, status: statusFilter || undefined, page, pageSize: 10 }),
        platformApi.listOrganizations({ status: 'active', pageSize: 1 }),
        platformApi.listOrganizations({ status: 'suspended', pageSize: 1 }),
      ]);
      setOrganizations(page1.rows);
      setMeta(page1.meta);
      setStats({ active: activeCount.meta.total, suspended: suspendedCount.meta.total });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => fetchOrganizations(), 250); // debounce search typing
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  return (
    <AppShell title="Organizations">
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total organizations" value={meta?.total ?? '—'} />
        <StatCard label="Active" value={stats.active ?? '—'} tone="verdant" />
        <StatCard label="Suspended" value={stats.suspended ?? '—'} tone="ember" />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by name or code…"
            className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-72"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-auto"
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
        <Link to="/platform/organizations/new">
          <Button className="w-full sm:w-auto">+ New Organization</Button>
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-slate" />
          </div>
        ) : error ? (
          <div className="px-6 py-10 text-center text-sm text-ember">{error}</div>
        ) : organizations.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
              <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
                <tr>
                  <th className="px-5 py-3 font-medium">Organization</th>
                  <th className="px-5 py-3 font-medium">Code</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Users</th>
                  <th className="px-5 py-3 font-medium">Modules on</th>
                  <th className="px-5 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => (
                  <tr
                    key={org.id}
                    className="cursor-pointer border-b border-line last:border-0 hover:bg-paper"
                    onClick={() => (window.location.href = `/platform/organizations/${org.id}`)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        {org.logo_url ? (
                          <img src={org.logo_url} alt="" className="h-8 w-8 rounded-md object-cover" />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-soft font-display text-sm text-ink">
                            {org.name[0]}
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-ink">{org.name}</div>
                          {org.description && (
                            <div className="max-w-xs truncate text-xs text-slate">{org.description}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-xs text-slate">{org.code}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={org.status} />
                    </td>
                    <td className="px-5 py-3.5 text-slate">{org.user_count}</td>
                    <td className="px-5 py-3.5 text-slate">{org.enabled_module_count}</td>
                    <td className="px-5 py-3.5 text-slate">{new Date(org.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <Pagination meta={meta} onPageChange={setPage} />
          </>
        )}
      </div>
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

function EmptyState() {
  return (
    <div className="px-6 py-16 text-center">
      <div className="font-display text-lg text-ink">No organizations yet</div>
      <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate">
        Onboard your first tenant to get started — every organization gets its own isolated users, teams, and data.
      </p>
      <Link to="/platform/organizations/new" className="mt-5 inline-block">
        <Button>+ New Organization</Button>
      </Link>
    </div>
  );
}
