import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/AppShell';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import { Toggle } from '../../../components/ui/Toggle';
import { platformApi } from '../api/platformApi';
import { getErrorMessage } from '../api/apiClient';

const initialForm = {
  name: '',
  code: '',
  logoUrl: '',
  description: '',
  adminName: '',
  adminEmail: '',
};

export default function CreateOrganization() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [modules, setModules] = useState([]);
  const [enabledKeys, setEnabledKeys] = useState({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    platformApi.listModules().then((mods) => {
      setModules(mods);
      setEnabledKeys(Object.fromEntries(mods.map((m) => [m.key, true]))); // default: every module on
    });
  }, []);

  function update(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function slugifyCode(value) {
    update('code', value.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const enabledModuleKeys = Object.entries(enabledKeys).filter(([, on]) => on).map(([key]) => key);
      const created = await platformApi.createOrganization({ ...form, enabledModuleKeys });
      setResult(created);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (result) {
    return (
      <AppShell title="Organization created">
        <div className="mx-auto max-w-lg rounded-xl border border-line bg-paper-raised p-7">
          <div className="font-display text-xl text-ink">
            <span className="lite-mark">{result.organization.name}</span> is live
          </div>
          <p className="mt-1 text-sm text-slate">
            The organization and its first admin account were created. Share these credentials with{' '}
            {result.adminUser.name} so they can sign in and finish setting up their team.
          </p>

          <div className="mt-5 space-y-3 rounded-lg bg-paper p-4 text-sm">
            <Row label="Organization code" value={result.organization.code} mono />
            <Row label="Admin name" value={result.adminUser.name} />
            <Row label="Admin email" value={result.adminUser.email} />
            <Row label="Temporary password" value={result.tempPassword} mono highlight />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate(`/platform/organizations/${result.organization.id}`)}>View organization</Button>
            <Button variant="secondary" onClick={() => navigate('/platform/organizations')}>
              Back to list
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell title="New Organization">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        {error && <div className="mb-5 rounded-lg bg-ember-soft px-4 py-3 text-sm text-ember">{error}</div>}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section className="rounded-xl border border-line bg-paper-raised p-6">
            <h2 className="font-display text-lg text-ink">Organization details</h2>
            <p className="mt-0.5 text-xs text-slate">Visible across the platform and to this tenant's own users.</p>

            <Field label="Organization name" required>
              <input
                required
                value={form.name}
                onChange={(e) => update('name', e.target.value)}
                placeholder="HiLite Builders"
                className={inputClass}
              />
            </Field>

            <Field label="Organization code" required hint="Lowercase letters, numbers and hyphens only">
              <input
                required
                value={form.code}
                onChange={(e) => slugifyCode(e.target.value)}
                placeholder="hilite-builders"
                className={`${inputClass} font-mono`}
              />
            </Field>

            <Field label="Logo URL" hint="Optional">
              <input
                value={form.logoUrl}
                onChange={(e) => update('logoUrl', e.target.value)}
                placeholder="https://…"
                className={inputClass}
              />
            </Field>

            <Field label="Description" hint="Optional">
              <textarea
                value={form.description}
                onChange={(e) => update('description', e.target.value)}
                rows={3}
                placeholder="Residential and commercial sales across North Kerala"
                className={inputClass}
              />
            </Field>
          </section>

          <div className="flex flex-col gap-6">
            <section className="rounded-xl border border-line bg-paper-raised p-6">
              <h2 className="font-display text-lg text-ink">Initial admin user</h2>
              <p className="mt-0.5 text-xs text-slate">This person manages teams, roles and users for the org.</p>

              <Field label="Admin name" required>
                <input
                  required
                  value={form.adminName}
                  onChange={(e) => update('adminName', e.target.value)}
                  placeholder="Asha Menon"
                  className={inputClass}
                />
              </Field>

              <Field label="Admin email" required>
                <input
                  required
                  type="email"
                  value={form.adminEmail}
                  onChange={(e) => update('adminEmail', e.target.value)}
                  placeholder="asha@hilitebuilders.com"
                  className={inputClass}
                />
              </Field>

              <p className="mt-3 text-xs text-slate">
                A temporary password is generated automatically — there's no email service wired up yet, so you'll see it
                on the next screen to share manually.
              </p>
            </section>

            <section className="rounded-xl border border-line bg-paper-raised p-6">
              <h2 className="font-display text-lg text-ink">Modules</h2>
              <p className="mt-0.5 text-xs text-slate">Turn off anything this organization shouldn't access yet.</p>

              <div className="mt-4 space-y-3">
                {modules.map((m) => (
                  <div key={m.key} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-ink">{m.name}</div>
                      <div className="text-xs text-slate">{m.description}</div>
                    </div>
                    <Toggle
                      checked={!!enabledKeys[m.key]}
                      onChange={(val) => setEnabledKeys((prev) => ({ ...prev, [m.key]: val }))}
                      label={`Toggle ${m.name}`}
                    />
                  </div>
                ))}
                {modules.length === 0 && <p className="text-sm text-slate">Loading module catalog…</p>}
              </div>
            </section>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => navigate('/platform/organizations')}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Spinner className="h-4 w-4" />}
            Create organization
          </Button>
        </div>
      </form>
    </AppShell>
  );
}

const inputClass =
  'mt-1.5 w-full rounded-lg border border-line px-3 py-2.5 text-sm text-ink outline-none focus:border-ink';

function Field({ label, required, hint, children }) {
  return (
    <label className="mt-4 block text-sm font-medium text-ink first:mt-0">
      {label}
      {required && <span className="text-ember"> *</span>}
      {hint && <span className="ml-1.5 text-xs font-normal text-slate">{hint}</span>}
      {children}
    </label>
  );
}

function Row({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate">{label}</span>
      <span className={`${mono ? 'font-mono' : 'font-medium'} ${highlight ? 'lite-mark text-ink' : 'text-ink'}`}>
        {value}
      </span>
    </div>
  );
}
