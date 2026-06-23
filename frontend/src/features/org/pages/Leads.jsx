import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Pill } from '../../../components/ui/Pill';
import { Pagination } from '../../../components/ui/Pagination';
import { Modal } from '../../../components/ui/Modal';
import { salesApi } from '../api/salesApi';
import { getErrorMessage } from '../api/apiClient';
import { LEAD_STATUSES, statusLabel, statusTone } from '../constants/leadStatus';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [meta, setMeta] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => fetchLeads(), 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, statusFilter, page]);

  async function fetchLeads() {
    setIsLoading(true);
    setError('');
    try {
      const { rows, meta: m } = await salesApi.listLeads({ search: search || undefined, status: statusFilter || undefined, page });
      setLeads(rows);
      setMeta(m);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AppShell title="Leads">
      {error && <div className="mb-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2 sm:flex-1 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => { setPage(1); setSearch(e.target.value); }}
            placeholder="Search by name or mobile…"
            className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}
            className="w-full rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm text-ink outline-none focus:border-ink sm:w-auto"
          >
            <option value="">All statuses</option>
            {LEAD_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="w-full sm:w-auto sm:flex-shrink-0">+ New Lead</Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-line bg-paper-raised">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6 text-slate" />
          </div>
        ) : leads.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="font-display text-lg text-ink">No leads found</div>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate">Adjust your filters, or add a new lead to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line bg-paper text-xs uppercase tracking-wide text-slate">
              <tr>
                <th className="px-5 py-3 font-medium">Lead</th>
                <th className="px-5 py-3 font-medium">Project</th>
                <th className="px-5 py-3 font-medium">Assigned To</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => (
                <tr key={lead.id} className="border-b border-line last:border-0 hover:bg-paper">
                  <td className="px-5 py-3.5">
                    <Link to={`/org/leads/${lead.id}`} className="font-medium text-ink hover:underline">
                      {lead.name}
                    </Link>
                    <div className="text-xs text-slate">{lead.mobile_number}</div>
                  </td>
                  <td className="px-5 py-3.5 text-slate">{lead.project || '—'}</td>
                  <td className="px-5 py-3.5 text-slate">{lead.assigned_user_name || 'Unassigned'}</td>
                  <td className="px-5 py-3.5">
                    <Pill label={statusLabel(lead.status)} tone={statusTone(lead.status)} />
                  </td>
                  <td className="px-5 py-3.5 text-slate">{new Date(lead.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
        <Pagination meta={meta} onPageChange={setPage} />
      </div>

      <CreateLeadModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); fetchLeads(); }} />
    </AppShell>
  );
}

function CreateLeadModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', mobileNumber: '', email: '', source: '', project: '', assignedUserId: '' });
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({ name: '', mobileNumber: '', email: '', source: '', project: '', assignedUserId: '' });
      setError('');
      salesApi.listAssignableUsers().then(setAssignableUsers).catch(() => {});
    }
  }, [open]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await salesApi.createLead({ ...form, assignedUserId: form.assignedUserId || undefined });
      onCreated();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="New lead" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        <label className="block text-sm font-medium text-ink">
          Name
          <input required value={form.name} onChange={(e) => update('name', e.target.value)} placeholder="John Buyer"
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Mobile number
            <input required value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)} placeholder="9876543210"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Email <span className="text-xs font-normal text-slate">Optional</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="john@example.com"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Source <span className="text-xs font-normal text-slate">Optional</span>
            <input value={form.source} onChange={(e) => update('source', e.target.value)} placeholder="Website"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Project <span className="text-xs font-normal text-slate">Optional</span>
            <input value={form.project} onChange={(e) => update('project', e.target.value)} placeholder="Skyline Towers"
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
        </div>

        <label className="mt-4 block text-sm font-medium text-ink">
          Assign to <span className="text-xs font-normal text-slate">Defaults to you</span>
          <select value={form.assignedUserId} onChange={(e) => update('assignedUserId', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink">
            <option value="">Myself</option>
            {assignableUsers.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </label>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Create lead
          </Button>
        </div>
      </form>
    </Modal>
  );
}
