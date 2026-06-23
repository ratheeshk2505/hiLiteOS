export const LEAD_STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'visit_scheduled', label: 'Visit Scheduled' },
  { value: 'site_visit_completed', label: 'Site Visit Completed' },
  { value: 'negotiation', label: 'Negotiation' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
];

export const ACTIVITY_TYPES = [
  { value: 'phone_call', label: 'Phone Call' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'site_visit', label: 'Site Visit' },
  { value: 'virtual_meeting', label: 'Virtual Meeting' },
];

export function statusLabel(value) {
  return LEAD_STATUSES.find((s) => s.value === value)?.label || value;
}

export function activityTypeLabel(value) {
  return ACTIVITY_TYPES.find((a) => a.value === value)?.label || value;
}

export function statusTone(value) {
  if (value === 'won') return 'verdant';
  if (value === 'lost') return 'ember';
  return 'default';
}
