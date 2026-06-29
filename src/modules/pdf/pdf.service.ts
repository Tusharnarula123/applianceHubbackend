import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WarrantyRegistrationEntity } from '../../entities/warranty-registration.entity.js';
import { ClaimEntity } from '../../entities/claim.entity.js';
import { ApplianceEntity } from '../../entities/appliance.entity.js';
import { BookingEntity } from '../../entities/booking.entity.js';

// ─── Scana.in SVG logo (inline) ───────────────────────────────────────────────
const SCANA_LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" width="44" height="44">
  <rect width="400" height="400" fill="#0d1117" rx="32"/>
  <circle cx="155" cy="265" r="70" fill="none" stroke="#6b7280" stroke-width="22" opacity="0.7"/>
  <circle cx="245" cy="265" r="70" fill="none" stroke="#8b949e" stroke-width="22" opacity="0.8"/>
  <circle cx="200" cy="185" r="72" fill="none" stroke="#00d4d8" stroke-width="22"/>
  <g transform="translate(165,150)">
    <rect x="0" y="0" width="70" height="70" fill="none" stroke="#9ca3af" stroke-width="1.5" rx="2"/>
    <rect x="4" y="4" width="20" height="20" fill="none" stroke="#9ca3af" stroke-width="2" rx="1"/>
    <rect x="8" y="8" width="12" height="12" fill="#9ca3af" rx="1"/>
    <rect x="46" y="4" width="20" height="20" fill="none" stroke="#9ca3af" stroke-width="2" rx="1"/>
    <rect x="50" y="8" width="12" height="12" fill="#9ca3af" rx="1"/>
    <rect x="4" y="46" width="20" height="20" fill="none" stroke="#9ca3af" stroke-width="2" rx="1"/>
    <rect x="8" y="50" width="12" height="12" fill="#9ca3af" rx="1"/>
    <rect x="28" y="4" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="36" y="4" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="28" y="12" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="28" y="28" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="36" y="28" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="44" y="28" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="52" y="28" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="28" y="36" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="44" y="36" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="28" y="44" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="52" y="44" width="5" height="5" fill="#9ca3af" rx="0.5"/>
    <rect x="0" y="33" width="70" height="2" fill="#00d4d8" opacity="0.7" rx="1"/>
  </g>
</svg>`;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string | Date | null | undefined): string {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusClass(status = ''): string {
  return `status status-${status.toLowerCase().replace(/\s+/g, '_')}`;
}

// ─── Shared HTML shell ────────────────────────────────────────────────────────
function wrapHtml(title: string, badgeColor: string, badgeLabel: string, body: string): string {
  const generated = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <title>${title} — Scana.in</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      background: #f0f4f8;
      color: #1e293b;
      font-size: 13px;
      line-height: 1.6;
    }

    /* ── Print bar (hidden when printing) ── */
    .print-bar {
      position: fixed; top:0; left:0; right:0; z-index:100;
      background: #0d1117;
      padding: 10px 24px;
      display: flex; align-items: center; justify-content: space-between;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
    }
    .print-bar-brand { color:#fff; font-size:14px; font-weight:700; letter-spacing:-0.3px; }
    .print-bar-brand span { color:#00d4d8; }
    .print-bar-actions { display:flex; gap:10px; align-items:center; }
    .btn-print {
      background: linear-gradient(135deg,#00d4d8,#0891b2);
      color:#fff; border:none; padding:8px 20px; border-radius:8px;
      font-size:13px; font-weight:600; cursor:pointer;
      display:flex; align-items:center; gap:6px; font-family:inherit;
    }
    .btn-print:hover { opacity:0.9; }
    .btn-hint { color:#64748b; font-size:11px; }

    /* ── Page wrapper ── */
    .wrapper { padding: 72px 24px 40px; max-width:860px; margin:0 auto; }
    .page {
      background:#fff; border-radius:16px; overflow:hidden;
      box-shadow:0 8px 40px rgba(0,0,0,0.10);
    }

    /* ── Header ── */
    .header {
      background: linear-gradient(135deg,#0d1117 0%,#1a2332 100%);
      padding:28px 40px 24px;
      display:flex; align-items:center; justify-content:space-between;
    }
    .brand { display:flex; align-items:center; gap:10px; }
    .brand-name { color:#fff; font-size:18px; font-weight:700; letter-spacing:-0.4px; }
    .brand-name span { color:#00d4d8; }
    .brand-tagline { color:#64748b; font-size:9px; letter-spacing:2px; margin-top:2px; }
    .doc-badge {
      background:${badgeColor}; color:#fff; padding:6px 16px;
      border-radius:20px; font-size:11px; font-weight:600;
      letter-spacing:0.5px; text-transform:uppercase;
    }
    .accent-bar { height:3px; background:linear-gradient(90deg,#00d4d8,#0891b2,transparent); }

    /* ── Content ── */
    .content { padding:32px 40px 40px; }
    .doc-title { font-size:22px; font-weight:700; color:#0f172a; letter-spacing:-0.5px; margin-bottom:4px; }
    .doc-subtitle { color:#64748b; font-size:12px; margin-bottom:28px; }

    /* ── Meta chips ── */
    .meta-row { display:flex; gap:12px; margin-bottom:28px; flex-wrap:wrap; }
    .meta-chip { background:#f1f5f9; border:1px solid #e2e8f0; border-radius:8px; padding:8px 14px; font-size:11px; }
    .meta-chip .label { color:#94a3b8; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; display:block; margin-bottom:2px; }
    .meta-chip .value { color:#1e293b; font-weight:600; font-size:12px; }

    /* ── Status ── */
    .status { display:inline-block; padding:3px 10px; border-radius:12px; font-size:11px; font-weight:600; }
    .status-active,.status-approved,.status-completed,.status-confirmed { background:#dcfce7; color:#15803d; }
    .status-pending,.status-under_review { background:#fef9c3; color:#a16207; }
    .status-rejected,.status-denied,.status-cancelled { background:#fee2e2; color:#dc2626; }
    .status-in_progress,.status-processing { background:#dbeafe; color:#1d4ed8; }

    /* ── Section ── */
    .section { background:#f8fafc; border:1px solid #e2e8f0; border-radius:12px; padding:20px 24px; margin-bottom:16px; }
    .section-title {
      font-size:11px; font-weight:600; color:#00b4b8; text-transform:uppercase;
      letter-spacing:1px; margin-bottom:14px; display:flex; align-items:center; gap:6px;
    }
    .section-title::before { content:''; display:inline-block; width:3px; height:14px; background:#00d4d8; border-radius:2px; }

    /* ── Fields ── */
    .field-grid { display:grid; grid-template-columns:1fr 1fr; gap:12px 24px; }
    .field-grid.cols-3 { grid-template-columns:1fr 1fr 1fr; }
    .field-label { font-size:10px; color:#94a3b8; font-weight:500; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:3px; }
    .field-value { font-size:13px; color:#1e293b; font-weight:500; }
    .field-value.mono { font-family:'Courier New',monospace; font-size:11px; color:#475569; }

    /* ── Issue box ── */
    .issue-box {
      background:#fff; border:1px solid #e2e8f0;
      border-left:3px solid #00d4d8; border-radius:0 8px 8px 0;
      padding:14px 16px; color:#374151; font-size:13px; line-height:1.7;
    }

    /* ── Highlight ── */
    .highlight {
      background:linear-gradient(135deg,#0d1117,#1a2332);
      border-radius:12px; padding:20px 24px; margin-bottom:16px;
      display:flex; align-items:center; justify-content:space-between;
    }
    .highlight-label { color:#64748b; font-size:11px; font-weight:500; }
    .highlight-value { color:#fff; font-size:16px; font-weight:700; margin-top:2px; }
    .highlight-teal { color:#00d4d8; }

    /* ── Footer ── */
    .footer { margin-top:32px; padding-top:20px; border-top:1px solid #e2e8f0; display:flex; align-items:center; justify-content:space-between; }
    .footer-left { color:#94a3b8; font-size:10px; line-height:1.6; }
    .footer-right { text-align:right; color:#94a3b8; font-size:10px; }
    .footer-brand { color:#00d4d8; font-weight:700; font-size:11px; }

    /* ═══════════ PRINT STYLES ═══════════ */
    @media print {
      @page { size:A4; margin:0; }
      body { background:#fff; }
      .print-bar { display:none !important; }
      .wrapper { padding:0; max-width:none; margin:0; }
      .page { border-radius:0; box-shadow:none; min-height:100vh; }
      .header,.accent-bar,.doc-badge,.highlight,.status,.section-title::before {
        -webkit-print-color-adjust:exact; print-color-adjust:exact;
      }
      .section { break-inside:avoid; }
      .meta-row { break-inside:avoid; }
    }
  </style>
</head>
<body>

  <div class="print-bar">
    <div class="print-bar-brand">Scana<span>.in</span></div>
    <div class="print-bar-actions">
      <span class="btn-hint">To save as PDF → Print → Save as PDF</span>
      <button class="btn-print" onclick="window.print()">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="6 9 6 2 18 2 18 9"/>
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
          <rect x="6" y="14" width="12" height="8"/>
        </svg>
        Print / Save PDF
      </button>
    </div>
  </div>

  <div class="wrapper">
    <div class="page">
      <div class="header">
        <div class="brand">
          ${SCANA_LOGO_SVG}
          <div>
            <div class="brand-name">Scana<span>.in</span></div>
            <div class="brand-tagline">SCAN. CONNECT. SOLVE.</div>
          </div>
        </div>
        <div class="doc-badge">${badgeLabel}</div>
      </div>
      <div class="accent-bar"></div>
      <div class="content">
        ${body}
        <div class="footer">
          <div class="footer-left">
            This document is system-generated by <strong>Scana.in</strong> and is valid without a signature.<br/>
            For support: <strong>support@scana.in</strong> · <strong>scana.in</strong>
          </div>
          <div class="footer-right">
            <div class="footer-brand">Scana.in</div>
            Generated: ${generated}
          </div>
        </div>
      </div>
    </div>
  </div>

</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────

@Injectable()
export class PdfService {
  constructor(
    @InjectRepository(WarrantyRegistrationEntity)
    private warrantyRepository: Repository<WarrantyRegistrationEntity>,
    @InjectRepository(ClaimEntity)
    private claimRepository: Repository<ClaimEntity>,
    @InjectRepository(ApplianceEntity)
    private applianceRepository: Repository<ApplianceEntity>,
    @InjectRepository(BookingEntity)
    private bookingRepository: Repository<BookingEntity>,
  ) {}

  // ── Warranty Certificate ────────────────────────────────────────────────────
  async generateWarrantyHTML(warrantyId: string): Promise<string> {
    const warranty = await this.warrantyRepository.findOne({
      where: { id: warrantyId },
      relations: ['appliance'],
    });
    if (!warranty) throw new NotFoundException('Warranty not found');

    const body = `
      <div class="doc-title">Warranty Certificate</div>
      <div class="doc-subtitle">Official warranty registration document · Scana.in</div>
      <div class="meta-row">
        <div class="meta-chip"><span class="label">Warranty ID</span><span class="value mono">${warranty.id.slice(0,8).toUpperCase()}</span></div>
        <div class="meta-chip"><span class="label">Status</span><span class="value"><span class="${statusClass(warranty.status)}">${warranty.status ?? 'Active'}</span></span></div>
        <div class="meta-chip"><span class="label">Purchase Date</span><span class="value">${fmt(warranty.purchase_date)}</span></div>
        <div class="meta-chip"><span class="label">Expiry Date</span><span class="value">${fmt(warranty.expiry_date)}</span></div>
      </div>
      <div class="section">
        <div class="section-title">Customer Details</div>
        <div class="field-grid">
          <div class="field"><div class="field-label">Full Name</div><div class="field-value">${warranty.customer_name ?? '—'}</div></div>
          <div class="field"><div class="field-label">Email Address</div><div class="field-value">${warranty.customer_email ?? '—'}</div></div>
          ${warranty.customer_phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${warranty.customer_phone}</div></div>` : ''}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Product Details</div>
        <div class="field-grid cols-3">
          ${warranty.appliance ? `
            <div class="field"><div class="field-label">Product</div><div class="field-value">${warranty.appliance.name ?? warranty.appliance.model}</div></div>
            <div class="field"><div class="field-label">Model</div><div class="field-value">${warranty.appliance.model}</div></div>
            <div class="field"><div class="field-label">Category</div><div class="field-value">${warranty.appliance.category ?? '—'}</div></div>
            <div class="field"><div class="field-label">SKU</div><div class="field-value mono">${warranty.appliance.sku ?? '—'}</div></div>
          ` : ''}
          ${warranty.serial_number ? `<div class="field"><div class="field-label">Serial Number</div><div class="field-value mono">${warranty.serial_number}</div></div>` : ''}
        </div>
      </div>
      <div class="section">
        <div class="section-title">Coverage Terms</div>
        <p style="color:#64748b;font-size:12px;line-height:1.8;">
          This warranty covers manufacturing defects and component failures under normal usage conditions for the duration specified above.
          It does not cover damage from misuse, accidents, or unauthorized repairs.
          To file a claim, scan the product QR code or visit <strong>scana.in</strong>.
        </p>
      </div>`;

    return wrapHtml('Warranty Certificate', '#16a34a', 'Warranty Certificate', body);
  }

  // ── Claim Report ────────────────────────────────────────────────────────────
  async generateClaimHTML(claimId: string): Promise<string> {
    const claim = await this.claimRepository.findOne({
      where: { id: claimId },
      relations: ['appliance', 'warranty'],
    });
    if (!claim) throw new NotFoundException('Claim not found');

    const priorityColor: Record<string, string> = { high: '#dc2626', medium: '#d97706', low: '#16a34a' };
    const pColor = priorityColor[(claim.priority ?? 'medium').toLowerCase()] ?? '#64748b';

    const body = `
      <div class="doc-title">Warranty Claim Report</div>
      <div class="doc-subtitle">Official claim document · Scana.in</div>
      <div class="meta-row">
        <div class="meta-chip"><span class="label">Claim ID</span><span class="value mono">${claim.id.slice(0,8).toUpperCase()}</span></div>
        <div class="meta-chip"><span class="label">Status</span><span class="value"><span class="${statusClass(claim.status)}">${claim.status ?? '—'}</span></span></div>
        <div class="meta-chip"><span class="label">Priority</span><span class="value" style="color:${pColor};font-weight:700;">${(claim.priority ?? 'Medium').toUpperCase()}</span></div>
        <div class="meta-chip"><span class="label">Filed On</span><span class="value">${fmt(claim.filed_at)}</span></div>
        ${claim.resolved_at ? `<div class="meta-chip"><span class="label">Resolved On</span><span class="value">${fmt(claim.resolved_at)}</span></div>` : ''}
      </div>
      <div class="section">
        <div class="section-title">Customer Details</div>
        <div class="field-grid">
          <div class="field"><div class="field-label">Full Name</div><div class="field-value">${claim.customer_name ?? '—'}</div></div>
          <div class="field"><div class="field-label">Email Address</div><div class="field-value">${claim.customer_email ?? '—'}</div></div>
          ${claim.customer_phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${claim.customer_phone}</div></div>` : ''}
        </div>
      </div>
      ${claim.appliance ? `
      <div class="section">
        <div class="section-title">Product Details</div>
        <div class="field-grid cols-3">
          <div class="field"><div class="field-label">Product</div><div class="field-value">${claim.appliance.name ?? claim.appliance.model}</div></div>
          <div class="field"><div class="field-label">Model</div><div class="field-value">${claim.appliance.model}</div></div>
          <div class="field"><div class="field-label">SKU</div><div class="field-value mono">${claim.appliance.sku ?? '—'}</div></div>
        </div>
      </div>` : ''}
      <div class="section">
        <div class="section-title">Issue Description</div>
        <div class="issue-box">${claim.issue ?? '—'}</div>
      </div>
      ${claim.resolution_notes ? `
      <div class="section">
        <div class="section-title">Resolution Notes</div>
        <div class="issue-box" style="border-left-color:#16a34a;">${claim.resolution_notes}</div>
      </div>` : ''}`;

    return wrapHtml('Claim Report', '#dc2626', 'Claim Report', body);
  }

  // ── Appliance Summary Report ────────────────────────────────────────────────
  async generateApplianceHTML(applianceId: string): Promise<string> {
    const appliance = await this.applianceRepository.findOne({
      where: { id: applianceId },
      relations: ['business', 'documents', 'warranties', 'claims', 'bookings'],
    });
    if (!appliance) throw new NotFoundException('Appliance not found');

    const stats = [
      { label: 'Documents',  value: appliance.documents?.length  ?? 0, color: '#7c3aed' },
      { label: 'Warranties', value: appliance.warranties?.length ?? 0, color: '#16a34a' },
      { label: 'Claims',     value: appliance.claims?.length     ?? 0, color: '#dc2626' },
      { label: 'Bookings',   value: appliance.bookings?.length   ?? 0, color: '#0891b2' },
      { label: 'QR Scans',   value: (appliance as any).scans_count ?? 0, color: '#00d4d8' },
    ];

    const body = `
      <div class="doc-title">${appliance.name ?? appliance.model}</div>
      <div class="doc-subtitle">Appliance summary report · Scana.in</div>
      <div class="meta-row">
        <div class="meta-chip"><span class="label">Appliance ID</span><span class="value mono">${appliance.id.slice(0,8).toUpperCase()}</span></div>
        <div class="meta-chip"><span class="label">Status</span><span class="value"><span class="${statusClass((appliance as any).status)}">${(appliance as any).status ?? 'Active'}</span></span></div>
        ${appliance.business ? `<div class="meta-chip"><span class="label">Business</span><span class="value">${appliance.business.name}</span></div>` : ''}
      </div>
      <div class="section">
        <div class="section-title">Product Details</div>
        <div class="field-grid cols-3">
          <div class="field"><div class="field-label">Model</div><div class="field-value">${appliance.model ?? '—'}</div></div>
          <div class="field"><div class="field-label">Category</div><div class="field-value">${appliance.category ?? '—'}</div></div>
          <div class="field"><div class="field-label">SKU</div><div class="field-value mono">${appliance.sku ?? '—'}</div></div>
        </div>
      </div>
      <div class="section">
        <div class="section-title">Activity Overview</div>
        <div style="display:grid;grid-template-columns:repeat(5,1fr);gap:12px;">
          ${stats.map(s => `
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:16px 20px;text-align:center;">
              <div style="font-size:28px;font-weight:700;color:${s.color};">${s.value}</div>
              <div style="font-size:10px;color:#94a3b8;font-weight:600;text-transform:uppercase;letter-spacing:0.5px;margin-top:4px;">${s.label}</div>
            </div>`).join('')}
        </div>
      </div>
      ${appliance.business ? `
      <div class="section">
        <div class="section-title">Business Information</div>
        <div class="field-grid">
          <div class="field"><div class="field-label">Business Name</div><div class="field-value">${appliance.business.name}</div></div>
          ${appliance.business.phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${appliance.business.phone}</div></div>` : ''}
          ${appliance.business.email ? `<div class="field"><div class="field-label">Email</div><div class="field-value">${appliance.business.email}</div></div>` : ''}
        </div>
      </div>` : ''}`;

    return wrapHtml('Appliance Report', '#7c3aed', 'Appliance Report', body);
  }

  // ── Service Booking Confirmation ────────────────────────────────────────────
  async generateBookingHTML(bookingId: string): Promise<string> {
    const booking = await this.bookingRepository.findOne({
      where: { id: bookingId },
      relations: ['appliance', 'claim'],
    });
    if (!booking) throw new NotFoundException('Booking not found');

    const body = `
      <div class="doc-title">Service Booking Confirmation</div>
      <div class="doc-subtitle">Certified technician booking · Scana.in</div>
      <div class="meta-row">
        <div class="meta-chip"><span class="label">Booking ID</span><span class="value mono">${booking.id.slice(0,8).toUpperCase()}</span></div>
        <div class="meta-chip"><span class="label">Status</span><span class="value"><span class="${statusClass(booking.status)}">${booking.status ?? '—'}</span></span></div>
        <div class="meta-chip"><span class="label">Service Type</span><span class="value">${booking.service_type ?? '—'}</span></div>
        <div class="meta-chip"><span class="label">Preferred Date</span><span class="value">${fmt(booking.preferred_date)}</span></div>
        ${booking.preferred_time ? `<div class="meta-chip"><span class="label">Time</span><span class="value">${booking.preferred_time}</span></div>` : ''}
      </div>
      <div class="highlight">
        <div>
          <div class="highlight-label">Appointment Scheduled For</div>
          <div class="highlight-value">${fmt(booking.preferred_date)}${booking.preferred_time ? ` · <span class="highlight-teal">${booking.preferred_time}</span>` : ''}</div>
        </div>
        <div style="color:#00d4d8;font-size:32px;">📅</div>
      </div>
      <div class="section">
        <div class="section-title">Customer Details</div>
        <div class="field-grid">
          <div class="field"><div class="field-label">Full Name</div><div class="field-value">${booking.customer_name ?? '—'}</div></div>
          <div class="field"><div class="field-label">Email</div><div class="field-value">${booking.customer_email ?? '—'}</div></div>
          ${booking.customer_phone ? `<div class="field"><div class="field-label">Phone</div><div class="field-value">${booking.customer_phone}</div></div>` : ''}
        </div>
      </div>
      ${booking.appliance ? `
      <div class="section">
        <div class="section-title">Product Details</div>
        <div class="field-grid cols-3">
          <div class="field"><div class="field-label">Product</div><div class="field-value">${booking.appliance.name ?? booking.appliance.model}</div></div>
          <div class="field"><div class="field-label">Model</div><div class="field-value">${booking.appliance.model}</div></div>
          <div class="field"><div class="field-label">Category</div><div class="field-value">${booking.appliance.category ?? '—'}</div></div>
        </div>
      </div>` : ''}
      ${booking.notes ? `
      <div class="section">
        <div class="section-title">Additional Notes</div>
        <div class="issue-box" style="border-left-color:#0891b2;">${booking.notes}</div>
      </div>` : ''}
      <div class="section" style="background:#eff6ff;border-color:#bfdbfe;">
        <div class="section-title" style="color:#1d4ed8;">What to Expect</div>
        <p style="color:#1e40af;font-size:12px;line-height:1.8;">
          Our certified technician will contact you before arrival to confirm the appointment.
          Please keep the appliance accessible and ensure someone is present at the service address.
          For rescheduling or cancellation, contact us at least 24 hours in advance via <strong>scana.in</strong>.
        </p>
      </div>`;

    return wrapHtml('Booking Confirmation', '#0891b2', 'Booking Confirmation', body);
  }
}
