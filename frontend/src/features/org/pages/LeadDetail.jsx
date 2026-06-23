import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Pill } from '../../../components/ui/Pill';
import { Modal } from '../../../components/ui/Modal';
import { salesApi } from '../api/salesApi';
import { getErrorMessage } from '../api/apiClient';
import { LEAD_STATUSES, ACTIVITY_TYPES, statusLabel, statusTone, activityTypeLabel } from '../constants/leadStatus';

export default function LeadDetail() {
  const { id } = useParams();
  const [lead, setLead] = useState(null);
  const [activities, setActivities] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isAssigning, setIsAssigning] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function fetchAll() {
    setIsLoading(true);
    setError('');
    try {
      const [leadData, activityData, users] = await Promise.all([
        salesApi.getLead(id),
        salesApi.listActivities(id),
        salesApi.listAssignableUsers().catch(() => []),
      ]);
      setLead(leadData);
      setActivities(activityData.rows);
      setAssignableUsers(users);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleStatusChange(newStatus) {
    setIsUpdatingStatus(true);
    setError('');
    try {
      const updated = await salesApi.updateLeadStatus(id, newStatus);
      setLead(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  }

  async function handleReassign(userId) {
    setIsAssigning(true);
    setError('');
    try {
      const updated = await salesApi.assignLead(id, { assignedUserId: userId });
      setLead(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  }

  async function handleAutoAssign() {
    setIsAssigning(true);
    setError('');
    try {
      const updated = await salesApi.assignLead(id, { strategy: 'least_loaded' });
      setLead(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsAssigning(false);
    }
  }

  if (isLoading) {
    return (
      <AppShell title="Lead">
        <div className="flex justify-center py-16">
          <Spinner className="h-6 w-6 text-slate" />
        </div>
      </AppShell>
    );
  }

  if (!lead) {
    return (
      <AppShell title="Lead">
        <div className="rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error || 'Lead not found'}</div>
        <Link to="/org/leads" className="mt-4 inline-block text-sm text-slate underline">Back to leads</Link>
      </AppShell>
    );
  }

  return (
    <AppShell title={lead.name}>
      <Link to="/org/leads" className="text-sm text-slate hover:text-ink">← All leads</Link>

      {error && <div className="mt-4 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <section className="rounded-xl border border-line bg-paper-raised p-6 lg:col-span-2">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-xl text-ink">{lead.name}</h2>
                <Pill label={statusLabel(lead.status)} tone={statusTone(lead.status)} />
              </div>
              <div className="mt-1 text-sm text-slate">{lead.mobile_number}{lead.email ? ` · ${lead.email}` : ''}</div>
            </div>
            <button onClick={() => setIsEditOpen(true)} className="self-start text-sm font-medium text-ink hover:underline">
              Edit
            </button>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-line pt-5 text-sm sm:grid-cols-2">
            <Row label="Project" value={lead.project || '—'} />
            <Row label="Source" value={lead.source || '—'} />
            <Row label="Created by" value={lead.created_by_name || '—'} />
            <Row label="Created" value={new Date(lead.created_at).toLocaleString()} />
          </div>

          <div className="mt-5 border-t border-line pt-5">
            <h3 className="text-sm font-medium text-ink">Move through pipeline</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {LEAD_STATUSES.map((s) => (
                <button
                  key={s.value}
                  disabled={isUpdatingStatus || s.value === lead.status}
                  onClick={() => handleStatusChange(s.value)}
                  className={
                    'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed ' +
                    (s.value === lead.status
                      ? 'border-ink bg-ink text-paper'
                      : 'border-line text-ink hover:bg-paper disabled:opacity-50')
                  }
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-line bg-paper-raised p-6">
          <h3 className="font-display text-lg text-ink">Assignment</h3>
          <p className="mt-0.5 text-xs text-slate">Currently assigned to</p>
          <div className="mt-2 text-sm font-medium text-ink">{lead.assigned_user_name || 'Unassigned'}</div>

          <label className="mt-4 block text-sm font-medium text-ink">
            Reassign to
            <select
              disabled={isAssigning}
              value=""
              onChange={(e) => e.target.value && handleReassign(e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
            >
              <option value="">Choose a person…</option>
              {assignableUsers.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          </label>

          <Button variant="secondary" size="sm" disabled={isAssigning} onClick={handleAutoAssign} className="mt-3 w-full">
            {isAssigning && <Spinner className="h-4 w-4" />}
            Auto-assign (least loaded)
          </Button>
        </section>
      </div>

      <ActivityLog leadId={id} activities={activities} onLogged={fetchAll} />

      <EditLeadModal
        open={isEditOpen}
        lead={lead}
        onClose={() => setIsEditOpen(false)}
        onSaved={(updated) => {
          setLead(updated);
          setIsEditOpen(false);
        }}
      />
    </AppShell>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-slate">{label}</div>
      <div className="mt-0.5 text-ink">{value}</div>
    </div>
  );
}

function EditLeadModal({ open, lead, onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', mobileNumber: '', email: '', source: '', project: '' });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open && lead) {
      setForm({
        name: lead.name || '',
        mobileNumber: lead.mobile_number || '',
        email: lead.email || '',
        source: lead.source || '',
        project: lead.project || '',
      });
      setError('');
    }
  }, [open, lead]);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const updated = await salesApi.updateLead(lead.id, form);
      onSaved(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal open={open} title="Edit lead" onClose={onClose}>
      <form onSubmit={handleSubmit}>
        {error && <div className="mb-4 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

        <label className="block text-sm font-medium text-ink">
          Name
          <input required value={form.name} onChange={(e) => update('name', e.target.value)}
            className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
        </label>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Mobile number
            <input required value={form.mobileNumber} onChange={(e) => update('mobileNumber', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Email <span className="text-xs font-normal text-slate">Optional</span>
            <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block text-sm font-medium text-ink">
            Source <span className="text-xs font-normal text-slate">Optional</span>
            <input value={form.source} onChange={(e) => update('source', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
          <label className="block text-sm font-medium text-ink">
            Project <span className="text-xs font-normal text-slate">Optional</span>
            <input value={form.project} onChange={(e) => update('project', e.target.value)}
              className="mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink" />
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink hover:bg-paper">
            Cancel
          </button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function ActivityLog({ leadId, activities, onLogged }) {
  const [type, setType] = useState(ACTIVITY_TYPES[0].value);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await salesApi.createActivity(leadId, { type, notes: notes || undefined });
      setNotes('');
      onLogged();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="mt-6 rounded-xl border border-line bg-paper-raised p-6">
      <h3 className="font-display text-lg text-ink">Activity</h3>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-end">
        <select value={type} onChange={(e) => setType(e.target.value)} className="w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink sm:w-auto">
          {ACTIVITY_TYPES.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
        </select>
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Notes (optional)"
          className="w-full flex-1 rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink"
        />
        <Button type="submit" size="sm" disabled={isSubmitting} className="w-full sm:w-auto">
          {isSubmitting && <Spinner className="h-4 w-4" />}
          Log
        </Button>
      </form>
      {error && <div className="mt-3 rounded-lg bg-ember-soft px-3 py-2 text-sm text-ember">{error}</div>}

      <div className="mt-4 space-y-3">
        {activities.length === 0 ? (
          <p className="text-sm text-slate">No activity logged yet.</p>
        ) : (
          activities.map((a) => (
            <div key={a.id} className="flex items-start justify-between border-t border-line pt-3 first:border-0 first:pt-0">
              <div>
                <div className="text-sm font-medium text-ink">{activityTypeLabel(a.type)}</div>
                {a.notes && <div className="text-sm text-slate">{a.notes}</div>}
                <div className="mt-0.5 text-xs text-slate">by {a.created_by_name || 'Unknown'}</div>
              </div>
              <div className="text-xs text-slate">{new Date(a.occurred_at).toLocaleString()}</div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
