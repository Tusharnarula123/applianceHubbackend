/**
 * Scana's canonical case statuses. Help-desk statuses are mapped onto these,
 * so the customer timeline and analytics never depend on one vendor's wording.
 */
export const CASE_STATUSES = [
  'received', 'sent_to_service', 'awaiting_customer', 'appointment_scheduled',
  'parts_ordered', 'in_repair', 'resolved', 'closed', 'cancelled',
] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const CASE_STATUS_LABEL: Record<CaseStatus, string> = {
  received: 'Received',
  sent_to_service: 'With the service team',
  awaiting_customer: 'Waiting for you',
  appointment_scheduled: 'Visit scheduled',
  parts_ordered: 'Waiting for parts',
  in_repair: 'Repair in progress',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
};

/** What the customer should expect or do next — never a promise or an ETA. */
export const CASE_NEXT_STEP: Record<CaseStatus, string> = {
  received: 'Your case has been prepared. Adding photos, the receipt and the serial number now helps the team act faster.',
  sent_to_service: 'The service team has your case and full history. You will see their updates here as soon as they arrive.',
  awaiting_customer: 'The service team needs something from you — check their latest message below.',
  appointment_scheduled: 'A visit is booked. Keep the appliance accessible and the receipt handy.',
  parts_ordered: 'A part is on the way. The team will confirm the repair once it arrives.',
  in_repair: 'A technician is working on it.',
  resolved: 'The team marked this as resolved. Please tell us whether your appliance is working.',
  closed: 'This case is closed.',
  cancelled: 'This case was cancelled.',
};

export const OPEN_STATUSES: CaseStatus[] = ['received', 'sent_to_service', 'awaiting_customer', 'appointment_scheduled', 'parts_ordered', 'in_repair'];

/** Default help-desk status → canonical status (overridable per connection via config.status_map). */
const DEFAULT_MAP: Array<[RegExp, CaseStatus]> = [
  [/^(new|open|received|created|assigned|triag)/i, 'sent_to_service'],
  [/(waiting|awaiting|pending).*(customer|user|requester|reply)|^on.?hold|^pending$/i, 'awaiting_customer'],
  [/(schedul|appointment|visit|booked)/i, 'appointment_scheduled'],
  [/(part|backorder|spare)/i, 'parts_ordered'],
  [/(progress|working|repair|in_service|wip)/i, 'in_repair'],
  [/^(solved|resolved|fixed|done|completed?)$/i, 'resolved'],
  [/^closed$/i, 'closed'],
  [/(cancel|void|rejected|duplicate)/i, 'cancelled'],
];

export function mapProviderStatus(raw: string | null | undefined, custom?: Record<string, string> | null): CaseStatus | null {
  if (!raw) return null;
  const s = String(raw).trim();
  const fromCustom = custom?.[s] ?? custom?.[s.toLowerCase()];
  if (fromCustom && (CASE_STATUSES as readonly string[]).includes(fromCustom)) return fromCustom as CaseStatus;
  if ((CASE_STATUSES as readonly string[]).includes(s)) return s as CaseStatus;
  return DEFAULT_MAP.find(([re]) => re.test(s))?.[1] ?? null;
}
