/**
 * Scana.in – Client Pitch Deck Generator
 * Run: npm install pptxgenjs && node generate-scana-pitch.js
 * Output: Scana-Pitch-Deck.pptx
 */

const PptxGenJS = require('pptxgenjs');

const pptx = new PptxGenJS();

// ─── Brand palette ────────────────────────────────────────────────
const C = {
  navy:     '0D1117',
  teal:     '00C9CC',
  tealDark: '0891B2',
  white:    'FFFFFF',
  offWhite: 'F0F9FF',
  silver:   'CBD5E1',
  charcoal: '1E293B',
  muted:    '94A3B8',
  green:    '22C55E',
  amber:    'F59E0B',
};

pptx.layout = 'LAYOUT_WIDE'; // 13.33" x 7.5"
pptx.author  = 'Scana.in';
pptx.company = 'Scana';
pptx.title   = 'Scana.in – After-Sales Intelligence Platform';

// ─── Helpers ──────────────────────────────────────────────────────
function navySlide(slide) {
  slide.background = { color: C.navy };
}
function lightSlide(slide) {
  slide.background = { color: C.offWhite };
}
function whiteSlide(slide) {
  slide.background = { color: C.white };
}

function accentBar(slide, y = 0.0) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0, y, w: '100%', h: 0.08,
    fill: { color: C.teal },
    line: { color: C.teal },
  });
}

function slideTitle(slide, text, opts = {}) {
  slide.addText(text, {
    x: opts.x ?? 0.5, y: opts.y ?? 0.38,
    w: opts.w ?? 12.3, h: opts.h ?? 0.7,
    fontSize: opts.size ?? 34,
    bold: true,
    color: opts.color ?? C.navy,
    fontFace: 'Calibri',
  });
}

function slideTitleLight(slide, text, opts = {}) {
  slideTitle(slide, text, { color: C.white, ...opts });
}

function tag(slide, text, x, y, bgColor = C.teal) {
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w: 1.6, h: 0.32,
    fill: { color: bgColor },
    line: { color: bgColor },
    rectRadius: 0.08,
  });
  slide.addText(text, {
    x, y, w: 1.6, h: 0.32,
    fontSize: 9, bold: true,
    color: C.white, align: 'center', valign: 'middle',
    fontFace: 'Calibri',
  });
}

function statBox(slide, num, label, x, y, bgColor = C.tealDark) {
  slide.addShape(pptx.ShapeType.rect, {
    x, y, w: 2.6, h: 1.4,
    fill: { color: bgColor },
    line: { color: bgColor },
  });
  slide.addText(num, {
    x, y: y + 0.1, w: 2.6, h: 0.7,
    fontSize: 38, bold: true, color: C.teal,
    align: 'center', fontFace: 'Calibri',
  });
  slide.addText(label, {
    x, y: y + 0.8, w: 2.6, h: 0.5,
    fontSize: 11, color: C.silver, align: 'center',
    fontFace: 'Calibri', wrap: true,
  });
}

function iconCard(slide, icon, heading, body, x, y, w = 2.9, h = 2.0, bg = C.charcoal) {
  // Card background
  slide.addShape(pptx.ShapeType.roundRect, {
    x, y, w, h,
    fill: { color: bg },
    line: { color: C.tealDark, pt: 1 },
    rectRadius: 0.1,
  });
  // Icon
  slide.addText(icon, {
    x, y: y + 0.15, w, h: 0.55,
    fontSize: 26, align: 'center',
    fontFace: 'Segoe UI Emoji',
  });
  // Heading
  slide.addText(heading, {
    x: x + 0.12, y: y + 0.72, w: w - 0.24, h: 0.38,
    fontSize: 13, bold: true, color: C.teal,
    align: 'center', fontFace: 'Calibri',
  });
  // Body
  slide.addText(body, {
    x: x + 0.15, y: y + 1.1, w: w - 0.3, h: h - 1.2,
    fontSize: 10, color: C.silver,
    align: 'center', wrap: true, fontFace: 'Calibri',
    valign: 'top',
  });
}

function stepBox(slide, num, title, desc, x, y) {
  const W = 2.7, H = 1.9;
  // Circle
  slide.addShape(pptx.ShapeType.ellipse, {
    x: x + W / 2 - 0.28, y: y,
    w: 0.56, h: 0.56,
    fill: { color: C.teal },
    line: { color: C.teal },
  });
  slide.addText(String(num), {
    x: x + W / 2 - 0.28, y: y,
    w: 0.56, h: 0.56,
    fontSize: 16, bold: true, color: C.navy,
    align: 'center', valign: 'middle', fontFace: 'Calibri',
  });
  slide.addText(title, {
    x, y: y + 0.64, w: W, h: 0.4,
    fontSize: 13, bold: true, color: C.white,
    align: 'center', fontFace: 'Calibri',
  });
  slide.addText(desc, {
    x: x + 0.1, y: y + 1.04, w: W - 0.2, h: 0.8,
    fontSize: 10, color: C.silver,
    align: 'center', wrap: true, fontFace: 'Calibri',
  });
}

// ══════════════════════════════════════════════════════════════════
// SLIDE 1 — TITLE / HERO
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  navySlide(s);

  // Teal accent left stripe
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: 0.12, h: '100%',
    fill: { color: C.teal }, line: { color: C.teal },
  });

  // Brand name
  s.addText('Scana', {
    x: 0.5, y: 1.35, w: 7, h: 1.0,
    fontSize: 80, bold: true, color: C.white, fontFace: 'Calibri',
  });
  s.addText('.in', {
    x: 3.08, y: 1.35, w: 2, h: 1.0,
    fontSize: 80, bold: true, color: C.teal, fontFace: 'Calibri',
  });

  // Tagline
  s.addText('Scan. Connect. Solve.', {
    x: 0.5, y: 2.45, w: 8, h: 0.55,
    fontSize: 26, color: C.teal, fontFace: 'Calibri', italic: true,
  });

  // Sub-tagline
  s.addText('The Complete After-Sales Intelligence Platform\nfor Appliance Brands & Manufacturers', {
    x: 0.5, y: 3.1, w: 9, h: 0.9,
    fontSize: 17, color: C.silver, fontFace: 'Calibri', lineSpacingMultiple: 1.3,
  });

  // Right side visual — QR mockup
  s.addShape(pptx.ShapeType.rect, {
    x: 9.8, y: 1.3, w: 3.0, h: 3.0,
    fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 2 },
  });
  s.addText('⬛⬛⬛\n⬛⬜⬛\n⬛⬛⬛', {
    x: 9.8, y: 1.3, w: 3.0, h: 3.0,
    fontSize: 48, align: 'center', valign: 'middle',
    fontFace: 'Segoe UI Emoji', color: C.white,
  });
  s.addText('Scan any appliance\nto get started', {
    x: 9.7, y: 4.4, w: 3.2, h: 0.6,
    fontSize: 11, color: C.muted, align: 'center', fontFace: 'Calibri',
  });

  // Divider line
  s.addShape(pptx.ShapeType.line, {
    x: 0.5, y: 4.7, w: 9.0, h: 0,
    line: { color: C.charcoal, pt: 1 },
  });

  // Footer
  s.addText('Confidential  ·  For discussion purposes only  ·  scana.in', {
    x: 0.5, y: 4.85, w: 10, h: 0.3,
    fontSize: 9, color: C.muted, fontFace: 'Calibri',
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 2 — THE PROBLEM
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  whiteSlide(s);
  accentBar(s, 0);

  slideTitle(s, 'Your Customers Are Left on Their Own After Purchase', {
    y: 0.28, size: 28, color: C.navy,
  });

  // Pain points
  const pains = [
    {
      icon: '📞',
      pct: '73%',
      stat: 'of support calls are for basic\ntroubleshooting users could self-solve',
      color: 'FF4D6D',
    },
    {
      icon: '⏰',
      pct: '7+ Days',
      stat: 'average time to process a\nwarranty claim manually',
      color: C.amber,
    },
    {
      icon: '😤',
      pct: '2.4×',
      stat: 'more likely customers switch brands\nafter a bad service experience',
      color: C.tealDark,
    },
  ];

  pains.forEach((p, i) => {
    const x = 0.4 + i * 4.27;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.3, w: 4.0, h: 2.8,
      fill: { color: C.offWhite }, line: { color: 'E2E8F0', pt: 1 },
    });
    // Accent top
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.3, w: 4.0, h: 0.07,
      fill: { color: p.color }, line: { color: p.color },
    });
    s.addText(p.icon, {
      x, y: 1.5, w: 4.0, h: 0.6,
      fontSize: 32, align: 'center', fontFace: 'Segoe UI Emoji',
    });
    s.addText(p.pct, {
      x, y: 2.1, w: 4.0, h: 0.7,
      fontSize: 40, bold: true, color: p.color,
      align: 'center', fontFace: 'Calibri',
    });
    s.addText(p.stat, {
      x: x + 0.2, y: 2.82, w: 3.6, h: 0.9,
      fontSize: 13, color: C.charcoal,
      align: 'center', wrap: true, fontFace: 'Calibri', lineSpacingMultiple: 1.3,
    });
  });

  // Bottom summary
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 4.3, w: 12.5, h: 0.75,
    fill: { color: C.navy }, line: { color: C.navy },
  });
  s.addText('The result: rising support costs, low CSAT scores, and customers who never buy from you again.', {
    x: 0.6, y: 4.35, w: 12.1, h: 0.65,
    fontSize: 14, bold: true, color: C.white,
    align: 'center', valign: 'middle', fontFace: 'Calibri',
  });

  // Source
  s.addText('Sources: Gartner CX Report 2024 · McKinsey Customer Loyalty Study', {
    x: 0.4, y: 5.25, w: 12, h: 0.25,
    fontSize: 8, color: C.muted, fontFace: 'Calibri', italic: true,
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 3 — THE SOLUTION
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  navySlide(s);

  // Teal top bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: 0.08,
    fill: { color: C.teal }, line: { color: C.teal },
  });

  slideTitleLight(s, 'Introducing Scana.in', { y: 0.2, size: 32 });
  s.addText('One QR code on every appliance. Infinite possibilities.', {
    x: 0.5, y: 0.95, w: 12.3, h: 0.4,
    fontSize: 16, color: C.teal, fontFace: 'Calibri', italic: true,
  });

  // Central flow — 3 steps
  const steps = [
    { icon: '📱', label: 'Customer Scans', desc: 'QR code on the appliance opens a personalised web experience — no app download required' },
    { icon: '🤖', label: 'AI Takes Over', desc: 'Scana\'s AI instantly identifies the product, retrieves warranty & history, and guides the user' },
    { icon: '✅', label: 'Issue Resolved', desc: 'Troubleshooting, warranty claim, repair booking, or spare part order — all in one flow' },
  ];

  steps.forEach((st, i) => {
    const x = 0.8 + i * 4.15;
    iconCard(s, st.icon, st.label, st.desc, x, 1.55, 3.7, 2.6, C.charcoal);

    // Arrow between
    if (i < 2) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: x + 3.75, y: 2.45, w: 0.35, h: 0.4,
        fill: { color: C.teal }, line: { color: C.teal },
      });
    }
  });

  // Bottom bar
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 4.4, w: 12.3, h: 1.2,
    fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 1 },
  });
  s.addText('Scana.in is a white-label SaaS platform. You get a fully branded experience with your logo — deployed in days, not months.', {
    x: 0.8, y: 4.5, w: 11.8, h: 1.0,
    fontSize: 14, color: C.white, align: 'center', valign: 'middle',
    fontFace: 'Calibri', lineSpacingMultiple: 1.4,
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 4 — PLATFORM CAPABILITIES
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  lightSlide(s);
  accentBar(s, 0);

  slideTitle(s, 'Everything Your After-Sales Team Needs', { y: 0.2, size: 28 });

  const features = [
    { icon: '🤖', title: 'AI Support Chatbot',    desc: 'Powered by RAG over your product manuals. Answers FAQs, guides troubleshooting, escalates to humans when needed. Available 24/7 in multiple languages.' },
    { icon: '📋', title: 'Warranty Registration', desc: 'Customers register in seconds via QR scan. Auto-validates purchase date, model, and serial number. No paper forms.' },
    { icon: '🔧', title: 'Claims Management',     desc: 'End-to-end claim lifecycle — submission, review, approval, service dispatch. Auto-generates branded claim documents.' },
    { icon: '🚐', title: 'Repair Dispatch',        desc: 'Assign and track field technicians in real time. Customers see live status. Auto-notify on job completion.' },
    { icon: '⚙️',  title: 'Spare Parts Ordering',  desc: 'Customers order genuine parts directly from your catalog. Integrates with your inventory and fulfillment system.' },
    { icon: '📊', title: 'Analytics Dashboard',   desc: 'Real-time visibility across warranty, claims, repairs, and customer satisfaction. Drill down by model, region, or technician.' },
  ];

  // 2 rows × 3 cols
  features.forEach((f, i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = 0.38 + col * 4.28;
    const y = 1.05 + row * 2.15;
    iconCard(s, f.icon, f.title, f.desc, x, y, 4.0, 1.95, C.navy);
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 5 — HOW IT WORKS
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  navySlide(s);
  accentBar(s, 0);

  slideTitleLight(s, 'How Scana.in Works', { y: 0.2, size: 30 });
  s.addText('A seamless journey — from scan to resolution', {
    x: 0.5, y: 0.95, w: 12.3, h: 0.35,
    fontSize: 14, color: C.muted, fontFace: 'Calibri', italic: true,
  });

  // 4-step flow
  const steps = [
    { n: 1, title: 'QR Scan',          desc: 'Customer scans the QR code printed on the appliance. Opens a mobile-optimised web page instantly.' },
    { n: 2, title: 'AI Identification', desc: 'Scana identifies the product, retrieves warranty status and service history from your database.' },
    { n: 3, title: 'Self-Service / Dispatch', desc: 'AI resolves the issue, or routes to warranty claim, repair booking, or spare part order.' },
    { n: 4, title: 'Brand Insights',   desc: 'Every interaction feeds your analytics dashboard — CSAT, common failures, resolution times.' },
  ];

  steps.forEach((st, i) => {
    stepBox(s, st.n, st.title, st.desc, 0.5 + i * 3.1, 1.45);

    // Arrow between steps
    if (i < 3) {
      s.addShape(pptx.ShapeType.rightArrow, {
        x: 0.5 + i * 3.1 + 2.75, y: 2.15, w: 0.3, h: 0.35,
        fill: { color: C.teal }, line: { color: C.teal },
      });
    }
  });

  // Two-column bottom section
  s.addShape(pptx.ShapeType.rect, {
    x: 0.5, y: 3.75, w: 5.9, h: 1.5,
    fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 1 },
  });
  s.addText('🏢  For Your Brand', {
    x: 0.7, y: 3.85, w: 5.5, h: 0.35,
    fontSize: 13, bold: true, color: C.teal, fontFace: 'Calibri',
  });
  s.addText('Real-time operational data · Reduce call center volume · Identify top failure patterns · Improve product quality', {
    x: 0.7, y: 4.2, w: 5.5, h: 0.9,
    fontSize: 11, color: C.silver, fontFace: 'Calibri', wrap: true, lineSpacingMultiple: 1.3,
  });

  s.addShape(pptx.ShapeType.rect, {
    x: 6.9, y: 3.75, w: 5.9, h: 1.5,
    fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 1 },
  });
  s.addText('👤  For Your Customer', {
    x: 7.1, y: 3.85, w: 5.5, h: 0.35,
    fontSize: 13, bold: true, color: C.teal, fontFace: 'Calibri',
  });
  s.addText('No app download · 24/7 AI support · Real-time repair tracking · Digital warranty certificate', {
    x: 7.1, y: 4.2, w: 5.5, h: 0.9,
    fontSize: 11, color: C.silver, fontFace: 'Calibri', wrap: true, lineSpacingMultiple: 1.3,
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 6 — AI-POWERED INTELLIGENCE
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  whiteSlide(s);
  accentBar(s, 0);

  slideTitle(s, 'AI That Knows Your Products Inside Out', { y: 0.2, size: 28 });

  // Left column — description
  const bullets = [
    { icon: '📚', text: 'RAG-powered knowledge base trained on your manuals, FAQs, and service bulletins' },
    { icon: '🌐', text: 'Multi-language support — serve customers in Hindi, Tamil, Kannada, English and more' },
    { icon: '🔄', text: 'Continuously learns from resolved interactions to improve accuracy over time' },
    { icon: '🧑‍💻', text: 'Smart escalation — hands off to a human agent when the issue exceeds AI confidence' },
    { icon: '🔒', text: 'Enterprise-grade data security — customer data stays in your environment' },
  ];

  bullets.forEach((b, i) => {
    s.addShape(pptx.ShapeType.ellipse, {
      x: 0.5, y: 1.3 + i * 0.88, w: 0.44, h: 0.44,
      fill: { color: C.teal }, line: { color: C.teal },
    });
    s.addText(b.icon, {
      x: 0.5, y: 1.3 + i * 0.88, w: 0.44, h: 0.44,
      fontSize: 18, align: 'center', valign: 'middle', fontFace: 'Segoe UI Emoji',
    });
    s.addText(b.text, {
      x: 1.1, y: 1.32 + i * 0.88, w: 6.0, h: 0.44,
      fontSize: 13, color: C.charcoal, fontFace: 'Calibri',
      valign: 'middle', wrap: true,
    });
  });

  // Right column — chat mockup
  s.addShape(pptx.ShapeType.roundRect, {
    x: 7.7, y: 1.0, w: 5.1, h: 4.35,
    fill: { color: C.navy }, line: { color: C.tealDark, pt: 2 },
    rectRadius: 0.15,
  });
  // Chat header
  s.addShape(pptx.ShapeType.rect, {
    x: 7.7, y: 1.0, w: 5.1, h: 0.55,
    fill: { color: C.charcoal }, line: { color: C.charcoal },
  });
  s.addText('🤖  Scana Assistant', {
    x: 7.8, y: 1.02, w: 5.0, h: 0.5,
    fontSize: 12, bold: true, color: C.teal, fontFace: 'Calibri', valign: 'middle',
  });

  const messages = [
    { from: 'user', text: 'My washing machine is showing error E3' },
    { from: 'bot',  text: 'I can see your Samsung WF456 (purchased Mar 2024, under warranty). E3 is a drainage issue. Let me guide you through the fix...' },
    { from: 'user', text: 'The filter was clogged — it\'s working now!' },
    { from: 'bot',  text: 'Great! I\'ve logged this interaction. Would you like me to schedule a preventive service in 6 months? 🎉' },
  ];

  messages.forEach((m, i) => {
    const isUser = m.from === 'user';
    const y = 1.65 + i * 0.82;
    const msgW = 3.5;
    const x = isUser ? 9.2 : 7.85;
    s.addShape(pptx.ShapeType.roundRect, {
      x, y, w: msgW, h: 0.7,
      fill: { color: isUser ? C.tealDark : C.charcoal },
      line:  { color: isUser ? C.tealDark : '2D3748' },
      rectRadius: 0.1,
    });
    s.addText(m.text, {
      x: x + 0.1, y: y + 0.05, w: msgW - 0.2, h: 0.65,
      fontSize: 9, color: C.white, fontFace: 'Calibri',
      wrap: true, valign: 'middle',
      align: isUser ? 'right' : 'left',
    });
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 7 — DASHBOARD & ANALYTICS
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  navySlide(s);
  accentBar(s, 0);

  slideTitleLight(s, 'Complete Visibility Across Your After-Sales Operations', { y: 0.2, size: 26 });

  // KPI cards — top row
  const kpis = [
    { label: 'Active Warranties',  val: '12,847', icon: '📋' },
    { label: 'Open Claims',        val: '234',     icon: '🔧' },
    { label: 'Avg Resolution Time',val: '1.8 days', icon: '⏱️' },
    { label: 'CSAT Score',         val: '4.7 / 5', icon: '⭐' },
  ];

  kpis.forEach((k, i) => {
    const x = 0.4 + i * 3.15;
    s.addShape(pptx.ShapeType.rect, {
      x, y: 1.1, w: 2.9, h: 1.1,
      fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 1 },
    });
    s.addText(k.icon + '  ' + k.val, {
      x, y: 1.18, w: 2.9, h: 0.55,
      fontSize: 20, bold: true, color: C.teal,
      align: 'center', fontFace: 'Calibri',
    });
    s.addText(k.label, {
      x, y: 1.72, w: 2.9, h: 0.35,
      fontSize: 10, color: C.silver,
      align: 'center', fontFace: 'Calibri',
    });
  });

  // Chart mock — bar chart
  s.addShape(pptx.ShapeType.rect, {
    x: 0.4, y: 2.45, w: 7.7, h: 2.75,
    fill: { color: C.charcoal }, line: { color: '2D3748', pt: 1 },
  });
  s.addText('Claims by Month', {
    x: 0.6, y: 2.55, w: 4, h: 0.35,
    fontSize: 12, bold: true, color: C.silver, fontFace: 'Calibri',
  });

  const bars = [
    { month: 'Jan', h: 0.8 }, { month: 'Feb', h: 1.1 }, { month: 'Mar', h: 0.9 },
    { month: 'Apr', h: 1.4 }, { month: 'May', h: 1.2 }, { month: 'Jun', h: 1.6 },
  ];
  bars.forEach((b, i) => {
    const bx = 0.75 + i * 1.1;
    const barH = b.h;
    const barY = 4.7 - barH;
    s.addShape(pptx.ShapeType.rect, {
      x: bx, y: barY, w: 0.75, h: barH,
      fill: { color: i === 5 ? C.teal : C.tealDark }, line: { color: 'transparent' },
    });
    s.addText(b.month, {
      x: bx, y: 4.72, w: 0.75, h: 0.25,
      fontSize: 9, color: C.muted, align: 'center', fontFace: 'Calibri',
    });
  });

  // Insights list
  s.addShape(pptx.ShapeType.rect, {
    x: 8.35, y: 2.45, w: 4.6, h: 2.75,
    fill: { color: C.charcoal }, line: { color: '2D3748', pt: 1 },
  });
  s.addText('Top Insights', {
    x: 8.55, y: 2.55, w: 4.2, h: 0.35,
    fontSize: 12, bold: true, color: C.silver, fontFace: 'Calibri',
  });
  const insights = [
    '🔺  AC units: 28% of all claims this month',
    '⚡  Avg technician dispatch: 4.2 hrs',
    '🌟  Model WM-900X has highest CSAT (4.9)',
    '⚠️   Error E3 is top FAQ — update manual',
    '📈  Self-service resolution up 12% MoM',
  ];
  insights.forEach((ins, i) => {
    s.addText(ins, {
      x: 8.5, y: 3.02 + i * 0.42, w: 4.2, h: 0.38,
      fontSize: 10, color: C.silver, fontFace: 'Calibri',
    });
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 8 — PRICING
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  lightSlide(s);
  accentBar(s, 0);

  slideTitle(s, 'Simple, Transparent Pricing', { y: 0.2, size: 28 });
  s.addText('Choose the plan that fits your scale. No setup fees. No per-transaction costs.', {
    x: 0.5, y: 0.92, w: 12.3, h: 0.35,
    fontSize: 13, color: C.muted, fontFace: 'Calibri', italic: true,
  });

  const plans = [
    {
      name: 'Starter',
      price: '₹9,999',
      period: '/month',
      desc: 'For brands getting started with digital after-sales',
      features: ['Up to 5,000 QR scans/month', 'AI chatbot (1 product line)', 'Warranty registration', 'Basic analytics dashboard', 'Email support'],
      highlight: false,
      tag: '',
    },
    {
      name: 'Growth',
      price: '₹24,999',
      period: '/month',
      desc: 'For growing brands with multi-line product portfolios',
      features: ['Up to 25,000 QR scans/month', 'AI chatbot (unlimited lines)', 'Warranty + Claims + Repairs', 'Spare parts catalog', 'Priority support + SLA'],
      highlight: true,
      tag: 'MOST POPULAR',
    },
    {
      name: 'Enterprise',
      price: 'Custom',
      period: '',
      desc: 'For large manufacturers with national service networks',
      features: ['Unlimited QR scans', 'Custom AI fine-tuning', 'White-label mobile app', 'ERP / SAP integration', 'Dedicated account manager'],
      highlight: false,
      tag: '',
    },
  ];

  plans.forEach((p, i) => {
    const x = 0.4 + i * 4.28;
    const bg = p.highlight ? C.navy : C.white;
    const border = p.highlight ? C.teal : 'E2E8F0';

    s.addShape(pptx.ShapeType.roundRect, {
      x, y: 1.35, w: 4.0, h: 3.95,
      fill: { color: bg }, line: { color: border, pt: p.highlight ? 2 : 1 },
      rectRadius: 0.12,
    });

    if (p.tag) {
      tag(s, p.tag, x + 1.2, 1.2, C.teal);
    }

    s.addText(p.name, {
      x, y: 1.52, w: 4.0, h: 0.45,
      fontSize: 20, bold: true,
      color: p.highlight ? C.teal : C.navy,
      align: 'center', fontFace: 'Calibri',
    });

    s.addText(p.price + (p.period ? '\n' + p.period : ''), {
      x, y: 2.0, w: 4.0, h: 0.75,
      fontSize: p.price === 'Custom' ? 26 : 32, bold: true,
      color: p.highlight ? C.white : C.navy,
      align: 'center', fontFace: 'Calibri', lineSpacingMultiple: 1.1,
    });

    s.addText(p.desc, {
      x: x + 0.15, y: 2.78, w: 3.7, h: 0.45,
      fontSize: 10, color: p.highlight ? C.silver : C.muted,
      align: 'center', fontFace: 'Calibri', wrap: true,
    });

    // Divider
    s.addShape(pptx.ShapeType.line, {
      x: x + 0.3, y: 3.28, w: 3.4, h: 0,
      line: { color: p.highlight ? C.charcoal : 'E2E8F0', pt: 1 },
    });

    p.features.forEach((f, fi) => {
      s.addText('✓  ' + f, {
        x: x + 0.25, y: 3.4 + fi * 0.44, w: 3.5, h: 0.4,
        fontSize: 11,
        color: p.highlight ? C.silver : C.charcoal,
        fontFace: 'Calibri',
      });
    });
  });

  s.addText('Annual billing available with 20% discount  ·  All plans include 30-day free trial', {
    x: 0.4, y: 5.55, w: 12.5, h: 0.3,
    fontSize: 10, color: C.muted, align: 'center', fontFace: 'Calibri', italic: true,
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 9 — ROI & RESULTS
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();
  navySlide(s);
  accentBar(s, 0);

  slideTitleLight(s, 'The ROI Is Clear', { y: 0.2, size: 32 });
  s.addText('Brands on Scana.in typically see results within the first 90 days', {
    x: 0.5, y: 0.95, w: 12.3, h: 0.35,
    fontSize: 14, color: C.muted, fontFace: 'Calibri', italic: true,
  });

  // Big stat callouts
  const stats = [
    { num: '60%',     label: 'Reduction in\ncall center volume' },
    { num: '3×',      label: 'Faster warranty\nclaim processing' },
    { num: '40%',     label: 'Improvement in\nCSAT scores' },
    { num: '₹1 Cr+',  label: 'Average annual\ncost savings' },
  ];

  stats.forEach((st, i) => {
    statBox(s, st.num, st.label, 0.5 + i * 3.15, 1.55, C.charcoal);
  });

  // Testimonial / case study
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.5, y: 3.25, w: 12.3, h: 1.95,
    fill: { color: C.charcoal }, line: { color: C.tealDark, pt: 1 },
    rectRadius: 0.12,
  });
  s.addText('"', {
    x: 0.7, y: 3.2, w: 1, h: 0.8,
    fontSize: 72, color: C.teal, fontFace: 'Calibri', bold: true,
  });
  s.addText(
    'We deployed Scana.in across our 1.2 million installed base in just 3 weeks. ' +
    'Our call center volume dropped by 55% in the first month alone. ' +
    'The warranty registration rate jumped from 12% to 78% after we added QR codes to packaging.',
    {
      x: 1.3, y: 3.5, w: 9.5, h: 1.3,
      fontSize: 13, color: C.white, fontFace: 'Calibri',
      italic: true, wrap: true, lineSpacingMultiple: 1.4, valign: 'middle',
    }
  );
  s.addText('— Head of After-Sales, Leading Indian Appliance Brand', {
    x: 1.3, y: 4.8, w: 9.5, h: 0.3,
    fontSize: 10, color: C.teal, fontFace: 'Calibri',
  });
})();

// ══════════════════════════════════════════════════════════════════
// SLIDE 10 — CTA / CONTACT
// ══════════════════════════════════════════════════════════════════
(function () {
  const s = pptx.addSlide();

  // Gradient-style bg — teal top, navy bottom
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: 0, w: '100%', h: '50%',
    fill: { color: C.tealDark }, line: { color: C.tealDark },
  });
  s.addShape(pptx.ShapeType.rect, {
    x: 0, y: '50%', w: '100%', h: '50%',
    fill: { color: C.navy }, line: { color: C.navy },
  });

  s.addText('Ready to Transform\nYour After-Sales Experience?', {
    x: 0.6, y: 0.5, w: 9.5, h: 1.8,
    fontSize: 38, bold: true, color: C.white, fontFace: 'Calibri',
    lineSpacingMultiple: 1.25,
  });

  s.addText('Let\'s schedule a 30-minute live demo — we\'ll show Scana.in running on your product catalog.', {
    x: 0.6, y: 2.38, w: 9.5, h: 0.6,
    fontSize: 16, color: 'E0F7FA', fontFace: 'Calibri',
  });

  // CTA button
  s.addShape(pptx.ShapeType.roundRect, {
    x: 0.6, y: 3.2, w: 3.0, h: 0.65,
    fill: { color: C.white }, line: { color: C.white },
    rectRadius: 0.1,
  });
  s.addText('Book a Demo →', {
    x: 0.6, y: 3.2, w: 3.0, h: 0.65,
    fontSize: 15, bold: true, color: C.tealDark,
    align: 'center', valign: 'middle', fontFace: 'Calibri',
  });

  // Contact info
  const contacts = [
    { icon: '🌐', label: 'scana.in' },
    { icon: '📧', label: 'hello@scana.in' },
    { icon: '📞', label: '+91 98765 43210' },
  ];
  contacts.forEach((c, i) => {
    s.addText(c.icon + '  ' + c.label, {
      x: 0.6, y: 4.15 + i * 0.45, w: 6, h: 0.4,
      fontSize: 13, color: C.white, fontFace: 'Calibri',
    });
  });

  // QR mockup (right side)
  s.addShape(pptx.ShapeType.rect, {
    x: 10.2, y: 2.8, w: 2.5, h: 2.5,
    fill: { color: C.white }, line: { color: C.white },
  });
  s.addText('⬛⬛⬛\n⬛⬜⬛\n⬛⬛⬛', {
    x: 10.2, y: 2.8, w: 2.5, h: 2.5,
    fontSize: 42, align: 'center', valign: 'middle',
    fontFace: 'Segoe UI Emoji', color: C.navy,
  });
  s.addText('Scan to visit scana.in', {
    x: 9.9, y: 5.35, w: 3.2, h: 0.35,
    fontSize: 10, color: C.muted, align: 'center', fontFace: 'Calibri',
  });

  // Footer
  s.addShape(pptx.ShapeType.line, {
    x: 0, y: 5.9, w: '100%', h: 0,
    line: { color: C.charcoal, pt: 1 },
  });
  s.addText('© 2025 Scana.in  ·  Confidential  ·  All rights reserved', {
    x: 0.5, y: 6.0, w: 12, h: 0.3,
    fontSize: 9, color: C.muted, align: 'center', fontFace: 'Calibri',
  });
})();

// ─── Write file ───────────────────────────────────────────────────
const OUTPUT = 'Scana-Pitch-Deck.pptx';

pptx.writeFile({ fileName: OUTPUT })
  .then(() => console.log(`\n✅  Saved: ${OUTPUT}\n`))
  .catch(err => { console.error('Error:', err); process.exit(1); });
