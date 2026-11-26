'use strict';
/* AgencyOS — CEO dashboard for a digital marketing agency.
   All data lives in localStorage. Real clients use only verified facts.
   Everything else is demo data, clearly labeled as such. */

const LS_KEY = 'agencyos-v1';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = n => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const hoursAgo = h => new Date(Date.now() - h * 3600e3).toISOString();
const fmtDate = iso => { if (!iso) return '—'; const d = new Date(iso + 'T00:00:00'); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const fmtINR = n => '₹' + Number(n || 0).toLocaleString('en-IN');
const timeHM = iso => new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
const dayShort = iso => new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', { weekday: 'short' });
const isOverdue = t => t.status !== 'done' && t.deadline && t.deadline < todayISO();
const isDueToday = t => t.status !== 'done' && t.deadline === todayISO();
const digitsOnly = p => String(p || '').replace(/\D/g, '');
const waNumber = p => { let d = digitsOnly(p); if (d.length === 10) d = '91' + d; if (d.length === 11 && d[0] === '0') d = '91' + d.slice(1); return d; };
const waLink = (p, text) => 'https://wa.me/' + waNumber(p) + (text ? '?text=' + encodeURIComponent(text) : '');
const taskMsg = t => { const c = clientById(t.clientId); return 'Hi, new task for you: "' + t.title + '"' + (c ? ' — Client: ' + c.name : '') + (t.deadline ? ' — Deadline: ' + fmtDate(t.deadline) : '') + ' — Priority: ' + t.priority + '. — ' + (state.settings.agencyName || 'Agency'); };
const nextTeamId = () => { const n = state.employees.map(e => parseInt(String(e.teamId || '').replace(/\D/g, ''), 10) || 0); return 'TM-' + String((n.length ? Math.max.apply(null, n) : 0) + 1).padStart(3, '0'); };

/* Raj's social accounts — exact URLs from his GitHub profile "Let's Connect"
   (https://github.com/Rajanyadav2509). Do not change these URLs. */
const SOCIAL_ACCOUNTS = [
  { platform: 'LinkedIn', handle: 'rajan-yadav-9638452a5', url: 'https://www.linkedin.com/in/rajan-yadav-9638452a5', status: 'Connected' },
  { platform: 'GitHub', handle: 'Rajanyadav2509', url: 'https://github.com/Rajanyadav2509', status: 'Connected' },
  { platform: 'Portfolio', handle: 'rajan-portfolio-lemon.vercel.app', url: 'https://rajan-portfolio-lemon.vercel.app', status: 'Connected' },
  { platform: 'Instagram', handle: '@errajanyadav_', url: 'https://www.instagram.com/errajanyadav_', status: 'Connected' },
  { platform: 'WhatsApp', handle: '+91 7905040238', url: 'https://wa.me/917905040238', status: 'Connected' },
  { platform: 'Substack', handle: '@rajanyadav3', url: 'https://substack.com/@rajanyadav3', status: 'Connected' },
  { platform: 'X', handle: '@buildwithrajan', url: 'https://x.com/buildwithrajan', status: 'Connected' },
  { platform: 'Facebook', handle: 'Rajan Yadav • Tech', url: 'https://www.facebook.com/techgrowthlab', status: 'Connected' },
];
/* Demo login — stored only in this browser (no backend on this static site). */
const AUTH_KEY = 'agencyos-auth';
const SESSION_KEY = 'agencyos-session';

/* Blueprint CRM lifecycle stages (Sec. 4). */
const CRM_STAGES = ['New Lead', 'Qualified', 'Discovery', 'Proposal Sent', 'Negotiation', 'Won / Contracted', 'Onboarding', 'Active', 'Renewal', 'Lost'];
const CRM_WEIGHTS = { 'New Lead': 0.10, 'Qualified': 0.20, 'Discovery': 0.30, 'Proposal Sent': 0.50, 'Negotiation': 0.70, 'Won / Contracted': 1.00, 'Onboarding': 0.90, 'Active': 1.00, 'Renewal': 0.60, 'Lost': 0 };
const POST_STATUSES = ['Draft', 'Review', 'Approved', 'Scheduled', 'Published'];
const BRIEF_STATUSES = ['Brief', 'Draft', 'Review', 'Revisions', 'Approved', 'Delivered'];

/* Client social accounts (Sec. 6) — platforms a client profile can have.
   Status is 'Manual entry' or 'Not connected' only: live sync needs the
   client's platform authorization (OAuth), so an account is never shown
   as 'Connected' unless a real integration is wired up. */
const SOCIAL_PLATFORMS = ['LinkedIn', 'Instagram', 'X', 'Facebook', 'YouTube', 'TikTok', 'Threads', 'Website / Blog', 'Other'];
let socialPeriod = '30d';
function fmtDT(iso) { if (!iso) return '—'; const d = new Date(iso); return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) + ' ' + timeHM(iso); }
function socialMetrics(a, period) { return (a.metrics && a.metrics[period]) || null; }
function engRate(m) { if (!m || !m.reach) return 0; return m.engagement / m.reach * 100; }
function trendHTML(cur, prev) {
  if (cur == null && prev == null) return '<span class="muted">—</span>';
  const d = (Number(cur) || 0) - (Number(prev) || 0);
  return '<span class="' + (d >= 0 ? 'metric-up' : 'metric-down') + '">' + (d >= 0 ? '+' : '−') + Math.abs(d).toLocaleString('en-IN') + '</span>';
}

/* ---------------- Seed data ---------------- */
function seed() {
  const emp = (name, role, status, resp, color, teamId, phone, team) => ({ id: uid(), name, role, status, responsibilities: resp, color, demo: true, teamId, phone, team });
  const employees = [
    emp('Priya Sharma', 'Content Writer', 'Working', ['LinkedIn content writing', 'Newsletter drafts', 'Client content calendars'], '#a259ff', 'TM-001', '+91 98765 00001', 'Content'),
    emp('Arjun Mehta', 'Video Editor', 'Working', ['Reels and video editing', 'YouTube video edits', 'Thumbnail design'], '#2997ff', 'TM-002', '+91 98765 00002', 'Video'),
    emp('Neha Patel', 'Social Media Executive', 'Working', ['Daily posting across clients', 'Community replies', 'Engagement tracking'], '#2fd47c', 'TM-003', '+91 98765 00003', 'Social'),
    emp('Rohit Verma', 'Ads Specialist', 'On leave', ['Meta Ads campaigns', 'Ad performance reports', 'Pixel and tracking setup'], '#ffb547', 'TM-004', '+91 98765 00004', 'Ads'),
    emp('Sneha Iyer', 'Graphic Designer', 'Working', ['Carousels and creatives', 'Brand kits', 'Client presentations'], '#ff5f6d', 'TM-005', '+91 98765 00005', 'Design'),
  ];
  const E = i => employees[i].id;

  /* Demo social accounts for demo clients (Sec. 6) — manual-entry metrics,
     clearly labeled DEMO. Real clients (Amarendra, Alexx) get NO social
     accounts here: their profile URLs are not known, so they stay empty
     with an "Add link" prompt in the client detail. */
  const M = (followers, prevFollowers, reach, prevReach, impressions, engagement, posts, hrs) => ({ followers, prevFollowers, reach, prevReach, impressions, engagement, posts, updatedAt: hoursAgo(hrs) });
  const soc = (platform, handle, url, m7, m30) => ({ id: uid(), platform, handle, url, status: 'Manual entry', demo: true, metrics: { '7d': m7, '30d': m30 } });

  const clients = [
    { id: 'c-amarendra', name: 'Amarendra Nath Sasmal', service: 'LinkedIn Growth & Personal Branding', niche: 'Time Reset Mentor', startDate: '', deadline: '', amount: '', status: 'Active', demo: false,
      results: { profileViews: 1432, impressions: 1029, searchAppearances: 77, followers: 3058 },
      social: [],
      notes: 'Creator of the PACT Performance Framework. LinkedIn results are from his verified analytics.' },
    { id: 'c-alexx', name: 'Alexx Roy', service: 'LinkedIn Growth', niche: 'Freedom Lifestyle', startDate: '', deadline: '', amount: '', status: 'Active', demo: false,
      results: { profileViews: 533, impressions: 821, searchAppearances: 30, followers: 2740 },
      social: [],
      notes: 'Creator-focused personal brand. LinkedIn results are from his verified analytics.' },
    { id: 'c-fitlife', name: 'FitLife Gym', service: 'Instagram Growth', niche: 'Fitness', startDate: addDays(-40), deadline: addDays(10), amount: 25000, status: 'Active', demo: true,
      results: null,
      social: [
        soc('Instagram', '@fitlife.gym.demo', 'https://www.instagram.com/fitlife.gym.demo',
          M(12400, 12150, 12800, 10900, 24100, 1480, 4, 5),
          M(12400, 11800, 48200, 42100, 96400, 5210, 14, 5)),
      ],
      notes: 'Demo client.' },
    { id: 'c-techstart', name: 'TechStart Solutions', service: 'Meta Ads', niche: 'SaaS', startDate: addDays(-25), deadline: addDays(21), amount: 40000, status: 'Active', demo: true,
      results: null,
      social: [
        soc('LinkedIn', 'TechStart Solutions', 'https://www.linkedin.com/company/techstart-solutions-demo',
          M(3800, 3720, 5600, 4900, 8200, 340, 2, 6),
          M(3800, 3500, 21400, 18900, 30200, 1240, 8, 6)),
        soc('X', '@techstart.demo', 'https://x.com/techstart_demo',
          M(2100, 2120, 2400, 2900, 3900, 150, 3, 6),
          M(2100, 2150, 9800, 11200, 15400, 620, 10, 6)),
      ],
      notes: 'Demo client.' },
    { id: 'c-aroma', name: 'Cafe Aroma', service: 'Social Media Management', niche: 'Cafe', startDate: addDays(-60), deadline: addDays(5), amount: 15000, status: 'Active', demo: true,
      results: null,
      social: [
        soc('Instagram', '@cafearoma.demo', 'https://www.instagram.com/cafearoma.demo',
          M(8600, 8450, 8400, 7300, 16200, 940, 3, 4),
          M(8600, 8300, 31200, 27600, 58900, 3420, 12, 4)),
        soc('Facebook', 'Cafe Aroma', 'https://www.facebook.com/cafearoma.demo',
          M(5400, 5350, 5100, 4600, 8900, 520, 2, 4),
          M(5400, 5300, 18900, 17400, 32100, 1980, 9, 4)),
      ],
      notes: 'Demo client.' },
  ];

  /* Projects (Sec. 5) — every task below is linked to one of these. All demo. */
  const projects = [
    { id: 'p-amarendra', name: 'LinkedIn Growth — Amarendra', clientId: 'c-amarendra', ownerId: E(0), type: 'Retainer', status: 'On track', startDate: addDays(-45), dueDate: addDays(30), demo: true },
    { id: 'p-alexx', name: 'LinkedIn Growth — Alexx Roy', clientId: 'c-alexx', ownerId: E(0), type: 'Retainer', status: 'On track', startDate: addDays(-40), dueDate: addDays(35), demo: true },
    { id: 'p-fitlife', name: 'Instagram Growth — FitLife Gym', clientId: 'c-fitlife', ownerId: E(1), type: 'Retainer', status: 'At risk', startDate: addDays(-40), dueDate: addDays(10), demo: true },
    { id: 'p-techstart', name: 'Meta Ads — TechStart Solutions', clientId: 'c-techstart', ownerId: E(3), type: 'Campaign', status: 'On track', startDate: addDays(-25), dueDate: addDays(21), demo: true },
    { id: 'p-aroma', name: 'Social Media — Cafe Aroma', clientId: 'c-aroma', ownerId: E(2), type: 'Retainer', status: 'On track', startDate: addDays(-60), dueDate: addDays(5), demo: true },
  ];

  const T = (title, assignee, client, deadline, priority, status, completed, projectId) => ({
    id: uid(), title, assigneeId: assignee, clientId: client, deadline, priority, status,
    completedAt: completed || '', createdAt: addDays(-10), projectId: projectId || '',
  });
  const tasks = [
    T('LinkedIn carousel — PACT framework', E(0), 'c-amarendra', addDays(2), 'High', 'doing', '', 'p-amarendra'),
    T('Weekly content calendar — Amarendra', E(0), 'c-amarendra', addDays(-1), 'High', 'todo', '', 'p-amarendra'),
    T('Engagement replies — Amarendra LinkedIn', E(2), 'c-amarendra', addDays(0), 'Medium', 'doing', '', 'p-amarendra'),
    T('Freedom Lifestyle — 3 LinkedIn posts', E(0), 'c-alexx', addDays(3), 'Medium', 'todo', '', 'p-alexx'),
    T('YouTube SEO pack — Alexx channel', E(1), 'c-alexx', addDays(6), 'Medium', 'doing', '', 'p-alexx'),
    T('Meta ad creatives — TechStart', E(3), 'c-techstart', addDays(4), 'High', 'todo', '', 'p-techstart'),
    T('Instagram reels — FitLife Gym (4)', E(1), 'c-fitlife', addDays(1), 'High', 'doing', '', 'p-fitlife'),
    T('Monthly report — Cafe Aroma', E(2), 'c-aroma', addDays(-2), 'Medium', 'todo', '', 'p-aroma'),
    T('Client onboarding call — TechStart', E(4), 'c-techstart', addDays(-5), 'Medium', 'done', addDays(-5), 'p-techstart'),
    T('LinkedIn post — Time Reset morning routine', E(0), 'c-amarendra', addDays(-1), 'Medium', 'done', addDays(-1), 'p-amarendra'),
    T('Carousel design — PACT results', E(4), 'c-amarendra', addDays(-4), 'High', 'done', addDays(-2), 'p-amarendra'),
    T('Ad performance report — TechStart', E(3), 'c-techstart', addDays(-3), 'Medium', 'done', addDays(-3), 'p-techstart'),
    T('Reels batch — FitLife (week 2)', E(1), 'c-fitlife', addDays(-6), 'Medium', 'done', addDays(-6), 'p-fitlife'),
    T('Newsletter draft — Amarendra', E(0), 'c-amarendra', addDays(-2), 'Medium', 'done', addDays(-4), 'p-amarendra'),
  ];

  const campaigns = [
    { id: uid(), name: 'LinkedIn Growth — Lead Gen', platform: 'Meta', budget: 15000, spend: 12500, reach: 48000, leads: 86, conversions: 52, status: 'Active', demo: true },
    { id: uid(), name: 'Freedom Lifestyle — Brand Awareness', platform: 'Meta', budget: 10000, spend: 8200, reach: 32500, leads: 41, conversions: 24, status: 'Active', demo: true },
    { id: uid(), name: 'YouTube SEO — Traffic', platform: 'Meta', budget: 6000, spend: 5000, reach: 21000, leads: 28, conversions: 15, status: 'Paused', demo: true },
  ];

  const connections = SOCIAL_ACCOUNTS.map(a => ({ id: uid(), ...a }));

  const goals = {};
  employees.forEach((e, i) => { goals[e.id] = { tasksTarget: [12, 10, 12, 8, 10][i] }; });
  const leaveRequests = [
    { id: uid(), empId: E(3), from: addDays(7), to: addDays(9), reason: 'Family function', status: 'Pending' },
    { id: uid(), empId: E(2), from: addDays(-3), to: addDays(-2), reason: 'Medical appointment', status: 'Approved' },
  ];
  const announcements = [
    { id: uid(), text: 'All client reports are due by Friday 6 PM. Please update your tasks before the weekly review.', at: hoursAgo(20), by: 'Rajan Yadav' },
  ];

  const finance = {
    cashInHand: 340000,
    expenses: [
      { id: uid(), label: 'Salaries', amount: 187000 },
      { id: uid(), label: 'Meta Ads spend', amount: 25700 },
      { id: uid(), label: 'Tools & software', amount: 12000 },
      { id: uid(), label: 'Office & misc', amount: 8000 },
    ],
    invoices: [
      { id: uid(), clientId: 'c-fitlife', label: 'FitLife Gym — monthly retainer', amount: 25000, due: addDays(3), status: 'Pending' },
      { id: uid(), clientId: 'c-techstart', label: 'TechStart Solutions — monthly retainer', amount: 40000, due: addDays(-2), status: 'Overdue' },
      { id: uid(), clientId: 'c-aroma', label: 'Cafe Aroma — monthly retainer', amount: 15000, due: addDays(10), status: 'Pending' },
      { id: uid(), clientId: 'c-fitlife', label: 'FitLife Gym — previous month', amount: 25000, due: addDays(-28), status: 'Paid' },
    ],
  };
  const leads = [
    { id: uid(), name: 'Rahul Verma — Fitness Studio', source: 'Meta', service: 'Instagram Growth', value: 20000, stage: 'Proposal Sent', createdAt: addDays(-4) },
    { id: uid(), name: 'Sharma Jewellers', source: 'Google', service: 'Meta Ads', value: 35000, stage: 'Qualified', createdAt: addDays(-2) },
    { id: uid(), name: 'Dr. Mehta Clinic', source: 'Referral', service: 'Social Media Management', value: 15000, stage: 'Won / Contracted', createdAt: addDays(-12) },
    { id: uid(), name: 'Boutique Zara', source: 'Instagram', service: 'LinkedIn Growth', value: 18000, stage: 'New Lead', createdAt: addDays(-1) },
    { id: uid(), name: 'Kavya Interiors', source: 'LinkedIn', service: 'Personal Branding', value: 30000, stage: 'Negotiation', createdAt: addDays(-6) },
    { id: uid(), name: 'City Dental Care', source: 'Google', service: 'Meta Ads', value: 22000, stage: 'Lost', createdAt: addDays(-15) },
  ];
  const marketing = [
    { id: uid(), name: 'LinkedIn Growth — Lead Gen', channel: 'Meta', budget: 15000, spend: 12500, leads: 86, conversions: 52, revenue: 60000, status: 'Active', demo: true },
    { id: uid(), name: 'Freedom Lifestyle — Brand Awareness', channel: 'Meta', budget: 10000, spend: 8200, leads: 41, conversions: 24, revenue: 40000, status: 'Active', demo: true },
    { id: uid(), name: 'Google Search — LinkedIn Growth', channel: 'Google', budget: 12000, spend: 9000, leads: 34, conversions: 21, revenue: 45000, status: 'Active', demo: true },
    { id: uid(), name: 'Google — YouTube SEO', channel: 'Google', budget: 8000, spend: 6000, leads: 22, conversions: 13, revenue: 28000, status: 'Paused', demo: true },
    { id: uid(), name: 'LinkedIn Ads — B2B Founders', channel: 'LinkedIn', budget: 18000, spend: 15000, leads: 19, conversions: 11, revenue: 60000, status: 'Active', demo: true },
  ];
  const companyGoals = [
    { id: uid(), label: 'Quarterly revenue', target: 500000, current: 285000, unit: '₹', demo: true },
    { id: uid(), label: 'Active clients', target: 10, current: 5, unit: '', demo: true },
    { id: uid(), label: 'New hires this quarter', target: 3, current: 1, unit: '', demo: true },
  ];

  /* Proposals (Sec. 10) — all demo. */
  const proposals = [
    { id: uid(), leadName: 'Rahul Verma — Fitness Studio', clientId: '', title: 'Instagram Growth retainer — 3 months', scope: '12 reels/mo, daily stories, community replies, monthly report', fee: 20000, status: 'Sent', validUntil: addDays(10), version: 1, createdAt: addDays(-4), demo: true },
    { id: uid(), leadName: 'Kavya Interiors', clientId: '', title: 'Personal Branding — LinkedIn', scope: '8 posts/mo, 2 carousels, profile optimisation, engagement', fee: 30000, status: 'Negotiation', validUntil: addDays(5), version: 2, createdAt: addDays(-6), demo: true },
    { id: uid(), leadName: 'Sharma Jewellers', clientId: '', title: 'Meta Ads — festive campaign', scope: 'Ad account setup, 3 campaigns, creative, weekly optimisation', fee: 35000, status: 'Draft', validUntil: addDays(14), version: 1, createdAt: addDays(-2), demo: true },
    { id: uid(), leadName: 'Dr. Mehta Clinic', clientId: '', title: 'Social Media Management', scope: 'Daily posting, reels, Google Business updates', fee: 15000, status: 'Accepted', validUntil: addDays(-12), version: 1, createdAt: addDays(-12), demo: true },
  ];
  /* Service catalog (Sec. 5) — packages, retainers, one-time services. All demo prices. */
  const services = [
    { id: uid(), name: 'LinkedIn Growth Retainer', type: 'Retainer', price: 25000, unit: '/mo', deliverables: '12 posts/mo, 2 carousels, profile optimisation, engagement, monthly report', sla: 'Posts delivered by Friday each week', demo: true },
    { id: uid(), name: 'YouTube SEO Pack', type: 'Package', price: 15000, unit: 'one-time', deliverables: 'Titles, descriptions, tags, thumbnails, video summaries', sla: 'Delivery in 5 working days', demo: true },
    { id: uid(), name: 'Meta Ads Management', type: 'Retainer', price: 20000, unit: '/mo', deliverables: 'Campaign setup, 3 live campaigns, creative, weekly optimisation, report', sla: 'Weekly report every Monday', demo: true },
    { id: uid(), name: 'Social Media Management', type: 'Retainer', price: 18000, unit: '/mo', deliverables: 'Daily posting, 8 reels/mo, stories, community replies', sla: 'Calendar shared by 25th of each month', demo: true },
    { id: uid(), name: 'Personal Branding Sprint', type: 'Package', price: 30000, unit: 'one-time', deliverables: 'Positioning, content pillars, 8 posts, profile rewrite', sla: 'Delivery in 3 weeks', demo: true },
    { id: uid(), name: 'Website Design', type: 'One-time', price: 40000, unit: 'one-time', deliverables: '5-page website, mobile responsive, basic SEO, launch', sla: 'Delivery in 4 weeks', demo: true },
  ];
  /* Social posts (Sec. 6) — workflow: Draft → Review → Approved → Scheduled → Published. All demo. */
  const posts = [
    { id: uid(), clientId: 'c-amarendra', platform: 'LinkedIn', format: 'Carousel', caption: 'PACT framework — how to reset your time in 7 days', date: addDays(1), status: 'Scheduled', reach: null, demo: true },
    { id: uid(), clientId: 'c-amarendra', platform: 'LinkedIn', format: 'Text', caption: 'Time Reset morning routine — 5 habits before 8 AM', date: addDays(-1), status: 'Published', reach: null, demo: true },
    { id: uid(), clientId: 'c-alexx', platform: 'LinkedIn', format: 'Text', caption: 'Freedom Lifestyle — 3 lessons from building in public', date: addDays(2), status: 'Approved', reach: null, demo: true },
    { id: uid(), clientId: 'c-alexx', platform: 'LinkedIn', format: 'Carousel', caption: 'My content system — POSITION to REVIEW', date: addDays(3), status: 'Review', reach: null, demo: true },
    { id: uid(), clientId: 'c-fitlife', platform: 'Instagram', format: 'Reel', caption: 'Gym reel — 30-day transformation teaser', date: addDays(1), status: 'Draft', reach: null, demo: true },
    { id: uid(), clientId: 'c-fitlife', platform: 'Instagram', format: 'Reel', caption: 'Trainer tip — squat form in 30 seconds', date: addDays(0), status: 'Scheduled', reach: null, demo: true },
    { id: uid(), clientId: 'c-techstart', platform: 'LinkedIn', format: 'Text', caption: 'SaaS launch post — why we built TechStart', date: addDays(4), status: 'Draft', reach: null, demo: true },
    { id: uid(), clientId: 'c-aroma', platform: 'Instagram', format: 'Static', caption: 'Weekend coffee special — Cafe Aroma', date: addDays(-2), status: 'Published', reach: 2400, demo: true },
  ];
  /* Creative briefs (Sec. 7) — all demo. */
  const briefs = [
    { id: uid(), clientId: 'c-amarendra', title: 'Carousel — PACT results (client proof)', type: 'Design', ownerId: E(4), status: 'Review', revisions: 1, due: addDays(2), demo: true },
    { id: uid(), clientId: 'c-amarendra', title: 'Newsletter — Time Reset weekly', type: 'Copy', ownerId: E(0), status: 'Draft', revisions: 0, due: addDays(3), demo: true },
    { id: uid(), clientId: 'c-alexx', title: 'Video script — Freedom Lifestyle story', type: 'Video', ownerId: E(1), status: 'Approved', revisions: 2, due: addDays(5), demo: true },
    { id: uid(), clientId: 'c-fitlife', title: 'Reels batch — week 3 (4 reels)', type: 'Video', ownerId: E(1), status: 'Brief', revisions: 0, due: addDays(1), demo: true },
    { id: uid(), clientId: 'c-techstart', title: 'Ad creatives — festive offer (3 variants)', type: 'Design', ownerId: E(4), status: 'Revisions', revisions: 2, due: addDays(4), demo: true },
  ];
  /* SEO keywords (Sec. 8) — positions are demo samples; add real rank data when tracked. */
  const keywords = [
    { id: uid(), clientId: '', keyword: 'social media marketing agency bhavnagar', intent: 'Local', targetPage: '/', priority: 'High', status: 'Tracking', position: 9, demo: true },
    { id: uid(), clientId: '', keyword: 'youtube seo services india', intent: 'Commercial', targetPage: '/youtube-seo', priority: 'Medium', status: 'Content planned', position: null, demo: true },
    { id: uid(), clientId: '', keyword: 'instagram growth agency', intent: 'Commercial', targetPage: '/services', priority: 'Medium', status: 'Tracking', position: 31, demo: true },
    { id: uid(), clientId: 'c-amarendra', keyword: 'time management coach india', intent: 'Commercial', targetPage: '/services', priority: 'High', status: 'Tracking', position: null, demo: true },
    { id: uid(), clientId: 'c-amarendra', keyword: 'personal branding linkedin', intent: 'Informational', targetPage: '/blog', priority: 'Medium', status: 'Tracking', position: null, demo: true },
    { id: uid(), clientId: 'c-alexx', keyword: 'linkedin growth freelancer', intent: 'Commercial', targetPage: '/services', priority: 'High', status: 'Tracking', position: null, demo: true },
  ];
  /* SEO technical issues (Sec. 8) — all demo. */
  const seoIssues = [
    { id: uid(), clientId: '', issue: 'Portfolio — 3 service pages not indexed yet', severity: 'High', status: 'In progress', demo: true },
    { id: uid(), clientId: 'c-fitlife', issue: 'Slow mobile load (LCP 4.2s) — demo sample', severity: 'High', status: 'Open', demo: true },
    { id: uid(), clientId: 'c-techstart', issue: 'Broken internal link on pricing page — demo sample', severity: 'Low', status: 'Fixed', demo: true },
    { id: uid(), clientId: 'c-aroma', issue: 'Images missing alt text (12 images) — demo sample', severity: 'Low', status: 'Open', demo: true },
  ];

  return {
    settings: { agencyName: 'Raj Digital Agency', ceoName: 'Rajan Yadav', currency: '₹', capacity: 5 },
    employees, clients, tasks, campaigns, connections, goals, attendance: {}, leaveRequests, announcements, finance, leads, marketing, companyGoals,
    proposals, services, projects, posts, briefs, keywords, seoIssues,
    activity: [
      { id: uid(), text: 'Priya Sharma completed “LinkedIn post — Time Reset morning routine”.', at: hoursAgo(3) },
      { id: uid(), text: 'Arjun Mehta moved “Instagram reels — FitLife Gym (4)” to Doing.', at: hoursAgo(5) },
      { id: uid(), text: 'New task assigned to Neha Patel: “Monthly report — Cafe Aroma”.', at: hoursAgo(26) },
      { id: uid(), text: 'Sneha Iyer completed “Carousel design — PACT results” (2 days late).', at: hoursAgo(30) },
    ],
  };
}

/* ---------------- State ---------------- */
let state = null;
function load() {
  try { const raw = localStorage.getItem(LS_KEY); if (raw) { state = JSON.parse(raw); } } catch (e) {}
  if (!state) { state = seed(); save(); return; }
  // Migration for older saved states
  if (!state.goals) { state.goals = {}; state.employees.forEach(e => { state.goals[e.id] = { tasksTarget: 10 }; }); }
  if (!state.attendance) state.attendance = {};
  if (!state.leaveRequests) state.leaveRequests = [];
  if (!state.announcements) state.announcements = [];
  if (!state.finance) state.finance = seed().finance;
  if (!state.leads) state.leads = seed().leads;
  if (!state.marketing) state.marketing = seed().marketing;
  if (!state.companyGoals) state.companyGoals = seed().companyGoals;
  // New blueprint collections (added 2026-11-26 rebuild)
  const s2 = seed();
  if (!state.proposals) state.proposals = s2.proposals;
  if (!state.services) state.services = s2.services;
  if (!state.projects) state.projects = s2.projects;
  if (!state.posts) state.posts = s2.posts;
  if (!state.briefs) state.briefs = s2.briefs;
  if (!state.keywords) state.keywords = s2.keywords;
  if (!state.seoIssues) state.seoIssues = s2.seoIssues;
  if (!state.settings.capacity) state.settings.capacity = 5;
  // Lead stage migration to the blueprint lifecycle (Sec. 4)
  const STAGE_MAP = { 'New': 'New Lead', 'Contacted': 'Qualified', 'Proposal sent': 'Proposal Sent', 'Won': 'Won / Contracted' };
  state.leads.forEach(l => { if (STAGE_MAP[l.stage]) l.stage = STAGE_MAP[l.stage]; });
  // Campaign migration: budget + conversions
  state.campaigns.forEach(c => { if (c.budget == null) c.budget = Math.round((c.spend || 0) * 1.25); if (c.conversions == null) c.conversions = Math.max(0, Math.round((c.leads || 0) * 0.6)); });
  state.marketing.forEach(c => { if (c.budget == null) c.budget = Math.round((c.spend || 0) * 1.25); if (c.conversions == null) c.conversions = Math.max(0, Math.round((c.leads || 0) * 0.6)); });
  // Tasks: link to a project of the same client
  state.tasks.forEach(t => { if (!t.projectId) { const p = state.projects.find(x => x.clientId === t.clientId); if (p) t.projectId = p.id; } });
  // Connections: the canonical 8 accounts from the GitHub profile
  if (!state.connections || !state.connections.some(c => c.platform === 'GitHub')) state.connections = SOCIAL_ACCOUNTS.map(a => ({ id: uid(), ...a }));
  // Client social accounts (added 2026-11-26): every client gains a list;
  // old saved states keep working. Real clients stay empty (no invented
  // URLs); demo clients gain their demo accounts if they have none.
  state.clients.forEach(c => {
    if (!Array.isArray(c.social)) c.social = [];
    c.social.forEach(a => { if (!a.id) a.id = uid(); if (!a.status) a.status = 'Manual entry'; if (!a.metrics) a.metrics = {}; });
    if (c.demo && c.social.length === 0) {
      const demoClient = s2.clients.find(x => x.id === c.id);
      if (demoClient && demoClient.social && demoClient.social.length) c.social = demoClient.social;
    }
  });
  save();
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function logActivity(text) {
  state.activity.unshift({ id: uid(), text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 40);
}
window.addEventListener('storage', e => { if (e.key === LS_KEY) { load(); render(); } });

const empById = id => state.employees.find(e => e.id === id);
const clientById = id => state.clients.find(c => c.id === id);
const tasksOf = empId => state.tasks.filter(t => t.assigneeId === empId);
const openTasksOf = empId => tasksOf(empId).filter(t => t.status !== 'done');
const doneTasksOf = empId => tasksOf(empId).filter(t => t.status === 'done');
const onTimeDone = list => list.filter(t => t.completedAt && t.deadline && t.completedAt <= t.deadline).length;
const lateDone = list => list.filter(t => t.completedAt && t.deadline && t.completedAt > t.deadline).length;
function workload(empId) {
  const cap = (state.settings && state.settings.capacity) || 5;
  const n = openTasksOf(empId).length;
  if (n >= cap) return { label: 'Overloaded', cls: 'red' };
  if (n === 0) return { label: 'Available', cls: 'green' };
  return { label: 'Balanced', cls: 'blue' };
}
const projectById = id => state.projects.find(p => p.id === id);
function projectProgress(p) {
  const pt = state.tasks.filter(t => t.projectId === p.id);
  if (!pt.length) return { pct: 0, done: 0, total: 0 };
  const done = pt.filter(t => t.status === 'done').length;
  return { pct: Math.round(done / pt.length * 100), done, total: pt.length };
}
function projectStatusPill(s) {
  const map = { 'On track': 'green', 'At risk': 'red', 'Delayed': 'red', 'Completed': 'green', 'On hold': 'amber' };
  return '<span class="pill ' + (map[s] || 'grey') + '">' + esc(s) + '</span>';
}
function clientProfit(c) {
  const rev = Number(c.amount) || 0;
  if (!rev) return null;
  if (!c.demo) return { rev, cost: null, profit: null };
  const cost = Math.round(rev * 0.6);
  return { rev, cost, profit: rev - cost };
}
function statusPill(s) {
  const map = { 'Working': 'green', 'On leave': 'amber', 'Offline': 'grey', 'Active': 'green', 'Paused': 'amber', 'Done': 'green', 'Completed': 'green' };
  return '<span class="pill ' + (map[s] || 'grey') + '">' + esc(s) + '</span>';
}
function priorityPill(p) {
  return '<span class="pill ' + (p === 'High' ? 'red' : p === 'Medium' ? 'amber' : 'grey') + '">' + esc(p) + '</span>';
}
function demoTag() { return ' <span class="pill amber">DEMO</span>'; }

/* ---------------- Navigation ---------------- */
let currentView = 'overview', viewParam = null;
let taskFilter = { person: 'all', client: 'all', status: 'all' };
const TITLES = { overview: 'CEO Command Center', alerts: 'Alerts Center', team: 'Team', tasks: 'Tasks', clients: 'Clients', crm: 'CRM & Pipeline', proposals: 'Sales & Proposals', catalog: 'Service Catalog', projects: 'Projects', social: 'Social Calendar', monitoring: 'Social Monitoring', content: 'Content Studio', seo: 'SEO', portal: 'Client Portal', finance: 'Finance', marketing: 'Marketing', goals: 'Company Goals', reports: 'Reports', deadlines: 'Deadlines', hr: 'HR', attendance: 'Attendance & Leave', performance: 'Performance', workload: 'Workload', activity: 'Activity Log', ads: 'Paid Ads', connections: 'Connections', settings: 'Settings' };

function setView(v, param) {
  currentView = v; viewParam = param || null;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#viewTitle').textContent = (v === 'team' && param) ? 'Team Member' : (v === 'clients' && param) ? 'Client' : TITLES[v];
  render(); window.scrollTo(0, 0);
}
function render() {
  if (!isAuthed()) return;
  const el = $('#view');
  if (currentView === 'overview') el.innerHTML = viewOverview();
  else if (currentView === 'team') el.innerHTML = viewParam ? viewTeamDetail(viewParam) : viewTeam();
  else if (currentView === 'groups') el.innerHTML = viewGroups();
  else if (currentView === 'tasks') el.innerHTML = viewTasks();
  else if (currentView === 'clients') el.innerHTML = viewParam ? viewClientDetail(viewParam) : viewClients();
  else if (currentView === 'crm') el.innerHTML = viewCRM();
  else if (currentView === 'proposals') el.innerHTML = viewProposals();
  else if (currentView === 'catalog') el.innerHTML = viewCatalog();
  else if (currentView === 'projects') el.innerHTML = viewProjects();
  else if (currentView === 'social') el.innerHTML = viewSocial();
  else if (currentView === 'monitoring') el.innerHTML = viewMonitoring();
  else if (currentView === 'content') el.innerHTML = viewContent();
  else if (currentView === 'seo') el.innerHTML = viewSEO();
  else if (currentView === 'portal') el.innerHTML = viewPortal();
  else if (currentView === 'hr') el.innerHTML = viewHR();
  else if (currentView === 'ads') el.innerHTML = viewAds();
  else if (currentView === 'connections') el.innerHTML = viewConnections();
  else if (currentView === 'deadlines') el.innerHTML = viewDeadlines();
  else if (currentView === 'alerts') el.innerHTML = viewAlerts();
  else if (currentView === 'finance') el.innerHTML = viewFinance();
  else if (currentView === 'marketing') el.innerHTML = viewMarketing();
  else if (currentView === 'goals') el.innerHTML = viewGoals();
  else if (currentView === 'reports') el.innerHTML = viewReports();
  else if (currentView === 'attendance') el.innerHTML = viewAttendance();
  else if (currentView === 'performance') el.innerHTML = viewPerformance();
  else if (currentView === 'workload') el.innerHTML = viewWorkload();
  else if (currentView === 'activity') el.innerHTML = viewActivity();
  else if (currentView === 'settings') el.innerHTML = viewSettings();
  $('#ceoName').textContent = state.settings.ceoName;
  $('#agencyNameSide').textContent = state.settings.agencyName;
  $('#ceoAvatar').textContent = state.settings.ceoName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const ac = document.querySelector('#nav button[data-view="alerts"]');
  if (ac) { const n = alertCount(); ac.textContent = n ? 'Alerts (' + n + ')' : 'Alerts'; }
}

/* ---------------- Overview ---------------- */
/* ---------------- CEO Command Center (Sec. 13) ---------------- */
function viewOverview() {
  const done = state.tasks.filter(t => t.status === 'done');
  const pending = state.tasks.filter(t => t.status !== 'done');
  const overdue = state.tasks.filter(isOverdue);
  const working = state.employees.filter(e => e.status === 'Working').length;
  const activeClients = state.clients.filter(c => c.status === 'Active').length;
  const revenue = state.clients.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const spend = state.campaigns.reduce((s, c) => s + c.spend, 0);
  const leads = state.campaigns.reduce((s, c) => s + c.leads, 0);
  const convs = state.campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const onTime = onTimeDone(done), late = lateDone(done);
  const onTimeRate = done.length ? Math.round(onTime / done.length * 100) : 0;
  const overloaded = state.employees.filter(e => openTasksOf(e.id).length >= ((state.settings && state.settings.capacity) || 5));

  /* Business snapshot (Sec. 13) */
  const expenses = financeExpenses();
  const profit = revenue - expenses;
  const margin = revenue ? Math.round(profit / revenue * 100) : 0;
  const collected = state.finance.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0) + (state.finance.cashInHand || 0);
  /* Sales pipeline (Sec. 13) */
  const openLeads = state.leads.filter(l => !['Won / Contracted', 'Lost'].includes(l.stage));
  const newLeadsWeek = state.leads.filter(l => l.createdAt >= addDays(-7)).length;
  const decided = state.leads.filter(l => ['Won / Contracted', 'Lost'].includes(l.stage));
  const wonN = state.leads.filter(l => l.stage === 'Won / Contracted').length;
  const winRate = decided.length ? Math.round(wonN / decided.length * 100) : 0;
  const pipeValue = openLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const expectedRev = openLeads.reduce((s, l) => s + (Number(l.value) || 0) * (CRM_WEIGHTS[l.stage] || 0), 0);
  const proposalsSent = state.proposals.filter(p => ['Sent', 'Negotiation'].includes(p.status)).length;
  const renewalsDue = state.clients.filter(c => c.status === 'Active' && c.deadline && c.deadline >= todayISO() && c.deadline <= addDays(30)).length;
  /* Client portfolio (Sec. 13) */
  const atRiskClients = state.clients.filter(c => state.tasks.some(t => t.clientId === c.id && isOverdue(t)));
  const topClientAmt = Math.max(0, ...state.clients.map(c => Number(c.amount) || 0));
  const concentration = revenue ? Math.round(topClientAmt / revenue * 100) : 0;
  /* Delivery operations (Sec. 13) */
  const projectsOnTrack = state.projects.filter(p => p.status === 'On track').length;
  const cap = (state.settings && state.settings.capacity) || 5;
  const totalOpen = pending.length;
  const totalCap = state.employees.length * cap;
  const utilization = totalCap ? Math.round(totalOpen / totalCap * 100) : 0;
  const freeSlots = Math.max(0, totalCap - totalOpen);
  /* Social / content (Sec. 13) */
  const postsPlanned = state.posts.filter(p => ['Draft', 'Review'].includes(p.status)).length;
  const postsAwaiting = state.posts.filter(p => p.status === 'Review').length;
  const postsScheduled = state.posts.filter(p => p.status === 'Scheduled').length;
  const postsPublished = state.posts.filter(p => p.status === 'Published').length;
  const engagement = state.posts.filter(p => p.status === 'Published').reduce((s, p) => s + (p.reach || 0), 0);
  /* SEO (Sec. 13) — demo figures, clearly labeled */
  const seoOpen = state.seoIssues.filter(i => i.status !== 'Fixed').length;
  const seoClicks = 1240, seoImpr = 18500;
  /* Finance (Sec. 13) */
  const receivables = pendingPayments();
  const overdueInv = state.finance.invoices.filter(i => i.status === 'Overdue');
  const overdueAmt = overdueInv.reduce((s, i) => s + (Number(i.amount) || 0), 0);
  /* People (Sec. 13) */
  const onLeaveN = state.employees.filter(e => e.status === 'On leave').length;
  const pendingLeave = state.leaveRequests.filter(r => r.status === 'Pending').length;
  /* Risk & approvals (Sec. 13) */
  const pendingApprovals = pendingLeave + state.proposals.filter(p => p.status === 'Sent').length + postsAwaiting;
  const blocked = overdue.length;

  // Weekly completed-tasks chart (last 7 days)
  const days = [];
  for (let i = 6; i >= 0; i--) days.push(addDays(-i));
  const counts = days.map(d => done.filter(t => t.completedAt === d).length);
  const max = Math.max(1, ...counts);
  const chart = days.map((d, i) =>
    '<div class="bar"><span class="bval">' + counts[i] + '</span><div class="fill" style="height:' + Math.max(4, Math.round(counts[i] / max * 100)) + 'px"></div><span class="blabel">' + dayShort(d) + '</span></div>'
  ).join('');

  // Upcoming deadlines (tasks not done + clients with deadline)
  const items = [];
  state.tasks.filter(t => t.status !== 'done' && t.deadline).forEach(t => items.push({ date: t.deadline, label: t.title, who: (empById(t.assigneeId) || {}).name || '—', kind: 'Task' }));
  state.clients.filter(c => c.deadline).forEach(c => items.push({ date: c.deadline, label: c.name + ' — project deadline', who: c.service, kind: 'Client' }));
  items.sort((a, b) => a.date.localeCompare(b.date));
  const upcoming = items.slice(0, 5).map(it => {
    const od = it.date < todayISO();
    return '<li><b>' + esc(it.label) + '</b> <span class="muted">· ' + esc(it.who) + ' · ' + esc(it.kind) + ' · ' + fmtDate(it.date) + '</span>' + (od ? ' <span class="overdue">OVERDUE</span>' : '') + '</li>';
  }).join('') || '<li class="muted">No upcoming deadlines.</li>';

  const atRisk = [];
  overdue.forEach(t => atRisk.push('<li><b>' + esc(t.title) + '</b> — overdue since ' + fmtDate(t.deadline) + ' · ' + esc((empById(t.assigneeId) || {}).name || '') + '</li>'));
  overloaded.forEach(e => atRisk.push('<li><b>' + esc(e.name) + '</b> is overloaded — ' + openTasksOf(e.id).length + ' open tasks.</li>'));
  const riskHtml = atRisk.length ? atRisk.join('') : '<li class="muted">Nothing at risk right now.</li>';

  const feed = state.activity.slice(0, 8).map(a =>
    '<li>' + esc(a.text) + ' <span class="ftime">' + fmtDate(a.at.slice(0, 10)) + ' ' + timeHM(a.at) + '</span></li>'
  ).join('');

  return '' +
  '<div class="card" style="margin-bottom:18px"><h3>Executive actions</h3><div class="btnrow" style="margin-top:10px">' +
    '<button class="btn" onclick="setView(\'alerts\')">Approve pending items (' + pendingApprovals + ')</button>' +
    '<button class="btn ghost" onclick="openTaskForm()">Assign owner / create task</button>' +
    '<button class="btn ghost" onclick="setView(\'reports\')">Export report</button>' +
    '<button class="btn ghost" onclick="setView(\'crm\')">Review pipeline</button>' +
  '</div><p class="muted" style="margin-top:8px">Every KPI below drills down — click the section buttons to open the source records.</p></div>' +
  '<div class="cc-section"><h2>Business snapshot <span class="pill lime">Sec. 13</span></h2><div class="kpis">' +
    '<div class="card kpi"><div class="label">Monthly recurring revenue</div><div class="value lime">' + fmtINR(revenue) + '</div><div class="sub">' + activeClients + ' active clients · retainers on client records</div></div>' +
    '<div class="card kpi"><div class="label">Collected cash</div><div class="value">' + fmtINR(collected) + '</div><div class="sub">paid invoices + cash in hand ' + demoTag() + '</div></div>' +
    '<div class="card kpi"><div class="label">Expenses (this month)</div><div class="value">' + fmtINR(expenses) + '</div><div class="sub">salaries, ads, tools, office ' + demoTag() + '</div></div>' +
    '<div class="card kpi"><div class="label">Gross margin ' + demoTag() + '</div><div class="value" style="color:' + (margin >= 0 ? 'var(--green)' : 'var(--red)') + '">' + margin + '%</div><div class="sub">profit ' + fmtINR(profit) + ' on ' + fmtINR(revenue) + ' revenue · demo expenses, real-client amounts not set yet</div></div>' +
  '</div></div>' +
  '<div class="cc-section"><h2>Sales pipeline <span class="pill lime">Sec. 13</span></h2><div class="kpis">' +
    '<div class="card kpi"><div class="label">New leads (7 days)</div><div class="value">' + newLeadsWeek + '</div><div class="sub">' + openLeads.length + ' open leads in pipeline</div></div>' +
    '<div class="card kpi"><div class="label">Qualified pipeline</div><div class="value">' + fmtINR(pipeValue) + '</div><div class="sub">open deal value (not yet won / lost)</div></div>' +
    '<div class="card kpi"><div class="label">Proposals sent</div><div class="value">' + proposalsSent + '</div><div class="sub">' + state.proposals.length + ' proposals total · win rate ' + winRate + '%</div></div>' +
    '<div class="card kpi"><div class="label">Expected revenue</div><div class="value lime">' + fmtINR(Math.round(expectedRev)) + '</div><div class="sub">stage-weighted pipeline · ' + renewalsDue + ' renewal(s) due in 30 days</div></div>' +
  '</div></div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>Client portfolio</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Active clients</div><div class="svalue">' + activeClients + ' / ' + state.clients.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Churn risk</div><div class="svalue">' + atRiskClients.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Revenue concentration</div><div class="svalue">' + concentration + '%</div></div>' +
    '</div><p class="muted">Top client is ' + concentration + '% of monthly revenue. At-risk = a client with overdue tasks.</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'clients\')">Open clients</button></div></div>' +
    '<div class="card"><h3>Delivery operations</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Projects on track</div><div class="svalue">' + projectsOnTrack + ' / ' + state.projects.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Overdue deliverables</div><div class="svalue">' + overdue.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Utilization</div><div class="svalue">' + utilization + '%</div></div>' +
      '<div class="stat"><div class="slabel">Capacity free</div><div class="svalue">' + freeSlots + ' slots</div></div>' +
    '</div><p class="muted">' + done.length + ' tasks done · ' + pending.length + ' pending · ' + onTimeRate + '% on time.</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'projects\')">Open projects</button></div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>Campaign performance ' + demoTag() + '</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Media spend</div><div class="svalue">' + fmtINR(spend) + '</div></div>' +
      '<div class="stat"><div class="slabel">Leads</div><div class="svalue">' + leads + '</div></div>' +
      '<div class="stat"><div class="slabel">Conversions</div><div class="svalue">' + convs + '</div></div>' +
      '<div class="stat"><div class="slabel">ROAS</div><div class="svalue">' + (spend ? (state.marketing.reduce((s, c) => s + c.revenue, 0) / state.marketing.reduce((s, c) => s + c.spend, 0)).toFixed(1) + 'x' : '—') + '</div></div>' +
    '</div><p class="muted">Demo campaign numbers — connect Meta Ads for live spend and leads.</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'ads\')">Open paid ads</button></div></div>' +
    '<div class="card"><h3>Social &amp; content</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Posts planned</div><div class="svalue">' + postsPlanned + '</div></div>' +
      '<div class="stat"><div class="slabel">Awaiting approval</div><div class="svalue">' + postsAwaiting + '</div></div>' +
      '<div class="stat"><div class="slabel">Scheduled</div><div class="svalue">' + postsScheduled + '</div></div>' +
      '<div class="stat"><div class="slabel">Published</div><div class="svalue">' + postsPublished + '</div></div>' +
    '</div><p class="muted">Published-post reach in demo data: ' + engagement.toLocaleString('en-IN') + ' (demo).</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'social\')">Open social calendar</button></div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>SEO performance ' + demoTag() + '</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Organic clicks</div><div class="svalue">' + seoClicks.toLocaleString('en-IN') + '</div></div>' +
      '<div class="stat"><div class="slabel">Impressions</div><div class="svalue">' + seoImpr.toLocaleString('en-IN') + '</div></div>' +
      '<div class="stat"><div class="slabel">Technical issues</div><div class="svalue">' + seoOpen + ' open</div></div>' +
      '<div class="stat"><div class="slabel">Content shipped</div><div class="svalue">' + postsPublished + ' posts</div></div>' +
    '</div><p class="muted">Clicks / impressions are demo samples — connect Search Console for live SEO data.</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'seo\')">Open SEO</button></div></div>' +
    '<div class="card"><h3>Finance</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Receivables</div><div class="svalue">' + fmtINR(receivables) + '</div></div>' +
      '<div class="stat"><div class="slabel">Overdue invoices</div><div class="svalue">' + overdueInv.length + ' · ' + fmtINR(overdueAmt) + '</div></div>' +
      '<div class="stat"><div class="slabel">Cash flow</div><div class="svalue">' + fmtINR(state.finance.cashInHand) + '</div></div>' +
      '<div class="stat"><div class="slabel">Profitability</div><div class="svalue">' + fmtINR(profit) + '</div></div>' +
    '</div><p class="muted">Cash in hand is a demo figure. Profit = revenue − expenses.</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'finance\')">Open finance</button></div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>People</h3><div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Headcount</div><div class="svalue">' + state.employees.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Working today</div><div class="svalue">' + working + ' / ' + state.employees.length + '</div></div>' +
      '<div class="stat"><div class="slabel">Utilization</div><div class="svalue">' + utilization + '%</div></div>' +
      '<div class="stat"><div class="slabel">On leave</div><div class="svalue">' + onLeaveN + ' · ' + pendingLeave + ' request(s)</div></div>' +
    '</div><div class="btnrow"><button class="btn ghost small" onclick="setView(\'hr\')">Open HR</button></div></div>' +
    '<div class="card"><h3>Risk &amp; approvals</h3><ul class="feed">' + riskHtml + '</ul><p class="muted">' + pendingApprovals + ' item(s) waiting for your approval (leave, proposals, posts). ' + blocked + ' blocked/overdue item(s).</p><div class="btnrow"><button class="btn ghost small" onclick="setView(\'alerts\')">Open alerts center</button></div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>Tasks completed — last 7 days</h3><div class="chart">' + chart + '</div><p class="muted">On time: ' + onTime + ' · Late: ' + late + ' (of ' + done.length + ' completed)</p></div>' +
    '<div class="card"><h3>Monthly team goals</h3><div style="font-size:26px;font-weight:800">' + goalDoneMonth() + ' / ' + goalTargetMonth() + '</div><p class="muted">tasks completed this month vs team target</p><div class="btnrow" style="margin-top:12px"><button class="btn ghost small" onclick="setView(\'goals\')">Open goals</button></div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>Upcoming deadlines</h3><ul class="feed">' + upcoming + '</ul><div class="btnrow" style="margin-top:12px"><button class="btn ghost small" onclick="setView(\'deadlines\')">View all deadlines</button></div></div>' +
    '<div class="card"><h3>Recent activity</h3><ul class="feed">' + feed + '</ul></div>' +
  '</div>';
}

/* ---------------- Team ---------------- */
function viewTeam() {
  const working = state.employees.filter(e => e.status === 'Working').length;
  const onLeave = state.employees.filter(e => e.status === 'On leave').length;
  const offline = state.employees.filter(e => e.status === 'Offline').length;
  const rows = state.employees.map(e => {
    const open = openTasksOf(e.id), done = doneTasksOf(e.id);
    const total = open.length + done.length;
    const rate = total ? Math.round(done.length / total * 100) : 0;
    const wl = workload(e.id);
    const current = open[0];
    return '<div class="emp-row">' +
      '<div class="avatar">' + esc(e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) + '</div>' +
      '<div class="grow"><div class="ename">' + esc(e.name) + ' ' + (e.demo ? '<span class="pill amber">DEMO</span>' : '') + '</div>' +
      '<div class="emeta">' + esc(e.role) + ' · Now: ' + esc(current ? current.title : 'No open task') + '</div>' +
      '<div class="emeta">' + esc(e.teamId || 'No ID') + ' · ' + esc(e.team || 'General') + (e.phone ? ' · ' + esc(e.phone) : ' · No number') + '</div>' +
      '<div class="progress"><i style="width:' + rate + '%"></i></div></div>' +
      '<div style="text-align:right;min-width:150px"><div>' + statusPill(e.status) + ' <span class="pill ' + wl.cls + '">' + wl.label + '</span></div>' +
      '<div class="emeta" style="margin-top:6px">' + open.length + ' open · ' + done.length + ' done · ' + rate + '% complete</div></div>' +
      '<button class="btn ghost small" onclick="setView(\'team\',\'' + e.id + '\')">View</button>' +
      (e.phone ? '<a class="btn small" href="' + waLink(e.phone, 'Hi ' + e.name.split(' ')[0] + ', this is ' + (state.settings.agencyName || 'your agency') + '.') + '" target="_blank" rel="noopener">WhatsApp</a>' : '') +
    '</div>';
  }).join('');
  const latest = state.announcements[0];
  const annHtml = latest
    ? '<div class="note" style="border-left-color:var(--lime)"><b>Announcement — ' + esc(latest.by) + ' · ' + fmtDate(latest.at.slice(0, 10)) + ':</b> ' + esc(latest.text) + '</div>'
    : '';
  return '' + annHtml +
  '<div class="toolbar"><span class="pill green">Working: ' + working + '</span><span class="pill amber">On leave: ' + onLeave + '</span><span class="pill grey">Offline: ' + offline + '</span>' +
  '<span style="flex:1"></span><button class="btn ghost" onclick="openAnnouncementForm()">Post announcement</button><button class="btn" onclick="openEmployeeForm()">+ Add teammate</button></div>' +
  '<div class="card">' + rows + '</div>' +
  '<div class="note"><b>Accountability:</b> every teammate has defined responsibilities, a current task, and a workload status. Click “View” to see who is accountable for what, their on-time record, and their full task history. Demo teammates are marked DEMO — replace them with your real team.</div>';
}

function viewTeamDetail(id) {
  const e = empById(id);
  if (!e) return '<p class="muted">Teammate not found.</p><button class="btn ghost" onclick="setView(\'team\')">Back to team</button>';
  const myTasks = tasksOf(id);
  const done = doneTasksOf(id), open = openTasksOf(id);
  const total = myTasks.length;
  const rate = total ? Math.round(done.length / total * 100) : 0;
  const onTime = onTimeDone(done), late = lateDone(done);
  const wl = workload(id);
  const goalTarget = (state.goals[id] && state.goals[id].tasksTarget) || 0;
  const monthDone = done.filter(t => t.completedAt && t.completedAt >= monthStart()).length;
  const rows = myTasks.map(t => {
    const c = clientById(t.clientId);
    const od = isOverdue(t);
    return '<tr><td>' + esc(t.title) + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' + fmtDate(t.deadline) + (od ? ' <span class="overdue">OVERDUE</span>' : '') + '</td><td>' + priorityPill(t.priority) + '</td><td>' + statusPill(t.status === 'done' ? 'Done' : t.status === 'doing' ? 'Doing' : 'To Do') + '</td></tr>';
  }).join('');
  const act = state.activity.filter(a => a.text.includes(e.name)).slice(0, 5).map(a => '<li>' + esc(a.text) + ' <span class="ftime">' + fmtDate(a.at.slice(0, 10)) + ' ' + timeHM(a.at) + '</span></li>').join('') || '<li class="muted">No recent activity recorded.</li>';
  return '' +
  '<button class="btn ghost small" onclick="setView(\'team\')">← Back to team</button>' +
  '<div class="card" style="margin-top:14px"><div class="emp-row" style="border:none;padding:0">' +
    '<div class="avatar" style="width:56px;height:56px;font-size:18px">' + esc(e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) + '</div>' +
    '<div class="grow"><div class="ename" style="font-size:19px">' + esc(e.name) + ' ' + (e.demo ? '<span class="pill amber">DEMO</span>' : '') + '</div>' +
    '<div class="emeta">' + esc(e.role) + '</div>' +
    '<div class="emeta">' + esc(e.teamId || 'No ID') + ' · ' + esc(e.team || 'General') + (e.phone ? ' · ' + esc(e.phone) : ' · No number saved') + '</div>' +
    '<div class="btnrow" style="margin-top:8px">' +
      (e.phone ? '<a class="btn small" href="' + waLink(e.phone, 'Hi ' + e.name.split(' ')[0] + ', this is ' + (state.settings.agencyName || 'your agency') + '.') + '" target="_blank" rel="noopener">WhatsApp</a><a class="btn ghost small" href="tel:+' + waNumber(e.phone) + '">Call</a>' : '<span class="muted">Add a number to message or call.</span>') +
      '<button class="btn ghost small" onclick="openEmployeeForm(\'' + e.id + '\')">Edit</button>' +
      '<button class="btn danger small" onclick="deleteEmployee(\'' + e.id + '\')">Remove</button>' +
    '</div></div>' +
    '<div>' + statusPill(e.status) + ' <span class="pill ' + wl.cls + '">' + wl.label + ' · ' + open.length + ' open tasks</span></div>' +
  '</div></div>' +
  '<div class="grid2"><div class="card"><h3>Roles &amp; responsibilities</h3><ul class="feed">' + e.responsibilities.map(r => '<li>' + esc(r) + '</li>').join('') + '</ul></div>' +
  '<div class="card"><h3>Performance</h3><div class="stat-grid">' +
    '<div class="stat"><div class="slabel">Completion rate</div><div class="svalue">' + rate + '%</div></div>' +
    '<div class="stat"><div class="slabel">Completed on time</div><div class="svalue">' + onTime + '</div></div>' +
    '<div class="stat"><div class="slabel">Completed late</div><div class="svalue">' + late + '</div></div>' +
    '<div class="stat"><div class="slabel">Open tasks</div><div class="svalue">' + open.length + '</div></div>' +
    '<div class="stat"><div class="slabel">Monthly goal (tasks)</div><div class="svalue">' + monthDone + ' / ' + goalTarget + '</div></div>' +
  '</div><p class="muted">On time means finished on or before the deadline. Late completions are flagged in the activity feed.</p>' +
  '<label>Monthly tasks target <input type="number" min="0" value="' + goalTarget + '" onchange="setGoal(\'' + e.id + '\', this.value)" style="max-width:100px;display:inline-block"></label></div></div>' +
  '<div class="card"><h3>All tasks — ' + esc(e.name.split(' ')[0]) + '</h3>' +
  (myTasks.length ? '<table><tr><th>Task</th><th>Client</th><th>Deadline</th><th>Priority</th><th>Status</th></tr>' + rows + '</table>' : '<p class="empty">No tasks assigned yet.</p>') + '</div>' +
  '<div class="card"><h3>Recent activity</h3><ul class="feed">' + act + '</ul></div>';
}

/* ---------------- Team Groups (WhatsApp) ---------------- */
function viewGroups() {
  const byTeam = {};
  state.employees.forEach(e => { const k = (e.team || 'General').trim() || 'General'; (byTeam[k] = byTeam[k] || []).push(e); });
  const names = Object.keys(byTeam).sort();
  if (!names.length) return '<p class="muted">No teammates yet. Add one from the Team page.</p>';
  const cards = names.map(team => {
    const members = byTeam[team];
    const memberRows = members.map(e => {
      const open = openTasksOf(e.id);
      const taskList = open.length ? open.map(t => '<li>' + esc(t.title) + ' — due ' + fmtDate(t.deadline) + '</li>').join('') : '<li class="muted">No open tasks.</li>';
      return '<div class="emp-row">' +
        '<div class="avatar">' + esc(e.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()) + '</div>' +
        '<div class="grow"><div class="ename">' + esc(e.name) + ' ' + (e.demo ? '<span class="pill amber">DEMO</span>' : '') + '</div>' +
        '<div class="emeta">' + esc(e.teamId || 'No ID') + (e.phone ? ' · ' + esc(e.phone) : ' · No number') + '</div>' +
        '<ul class="feed" style="margin-top:6px">' + taskList + '</ul></div>' +
        '<div>' + (e.phone ? '<a class="btn small" href="' + waLink(e.phone, 'Hi ' + e.name.split(' ')[0] + ', this is ' + (state.settings.agencyName || 'your agency') + '.') + '" target="_blank" rel="noopener">WhatsApp</a> <a class="btn ghost small" href="tel:+' + waNumber(e.phone) + '">Call</a>' : '<span class="muted">No number</span>') + '</div>' +
      '</div>';
    }).join('');
    return '<div class="card"><h3>' + esc(team) + ' Team · ' + members.length + ' member' + (members.length === 1 ? '' : 's') + '</h3>' + memberRows +
      '<div class="btnrow" style="margin-top:12px"><button class="btn" onclick="copyGroupUpdate(this, \'' + team.replace(/'/g, "\\'") + '\')">Copy group task update</button></div></div>';
  }).join('');
  return '<div class="note"><b>WhatsApp groups:</b> a dashboard cannot create a WhatsApp group by itself — groups are made inside the WhatsApp app. Pick your team here, copy the task update, and paste it into the group you create in WhatsApp. Every member\'s number and open tasks are listed below, with one-tap WhatsApp and Call.</div>' + cards;
}
function copyGroupUpdate(btn, team) {
  const members = state.employees.filter(e => ((e.team || 'General').trim() || 'General') === team);
  const lines = ['Team update — ' + team + ' (' + (state.settings.agencyName || 'Agency') + ')'];
  members.forEach(e => {
    const open = openTasksOf(e.id);
    lines.push('• ' + e.name + ' (' + (e.teamId || 'No ID') + '): ' + (open.length ? open.map(t => t.title + ' (due ' + fmtDate(t.deadline) + ')').join('; ') : 'no open tasks'));
  });
  const text = lines.join('\n');
  const done = () => { btn.textContent = 'Copied!'; setTimeout(() => { btn.textContent = 'Copy group task update'; }, 2000); };
  if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(text).then(done).catch(() => { prompt('Copy this update:', text); }); }
  else { prompt('Copy this update:', text); }
}

/* ---------------- Tasks ---------------- */
function taskCard(t) {
  const e = empById(t.assigneeId), c = clientById(t.clientId);
  const od = isOverdue(t);
  const idx = ['todo', 'doing', 'done'].indexOf(t.status);
  return '<div class="task-card">' +
    '<div class="t-title">' + esc(t.title) + (od ? ' <span class="overdue">OVERDUE</span>' : '') + '</div>' +
    '<div class="t-meta">' + esc(e ? e.name : 'Unassigned') + ' · ' + esc(c ? c.name : 'No client') + '<br>Due ' + fmtDate(t.deadline) + ' · ' + priorityPill(t.priority) + '</div>' +
    '<div class="t-actions">' +
      (idx > 0 ? '<button class="btn ghost small" onclick="moveTask(\'' + t.id + '\',-1)">← Back</button>' : '') +
      (idx < 2 ? '<button class="btn small" onclick="moveTask(\'' + t.id + '\',1)">' + (t.status === 'doing' ? 'Mark done ✓' : 'Start →') + '</button>' : '') +
      (e && e.phone ? '<a class="btn small" href="' + waLink(e.phone, taskMsg(t)) + '" target="_blank" rel="noopener">WhatsApp ' + esc(e.name.split(' ')[0]) + '</a><a class="btn ghost small" href="tel:+' + waNumber(e.phone) + '">Call</a>' : '') +
      '<button class="btn ghost small" onclick="openTaskForm(\'' + t.id + '\')">Edit</button>' +
      '<button class="btn danger small" onclick="deleteTask(\'' + t.id + '\')">Delete</button>' +
    '</div></div>';
}

function viewTasks() {
  const f = taskFilter;
  const list = state.tasks.filter(t =>
    (f.person === 'all' || t.assigneeId === f.person) &&
    (f.client === 'all' || t.clientId === f.client) &&
    (f.status === 'all' || t.status === f.status));
  const col = (status, title) => {
    const items = list.filter(t => t.status === status);
    return '<div class="col"><h3>' + title + ' <span class="count">' + items.length + '</span></h3>' +
      (items.length ? items.map(taskCard).join('') : '<p class="empty">Nothing here.</p>') + '</div>';
  };
  const empOpts = state.employees.map(e => '<option value="' + e.id + '"' + (f.person === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('');
  const cliOpts = state.clients.map(c => '<option value="' + c.id + '"' + (f.client === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
  return '' +
  '<div class="toolbar">' +
    '<select onchange="taskFilter.person=this.value;render()"><option value="all">All people</option>' + empOpts + '</select>' +
    '<select onchange="taskFilter.client=this.value;render()"><option value="all">All clients</option>' + cliOpts + '</select>' +
    '<select onchange="taskFilter.status=this.value;render()"><option value="all">All statuses</option><option value="todo"' + (f.status === 'todo' ? ' selected' : '') + '>To Do</option><option value="doing"' + (f.status === 'doing' ? ' selected' : '') + '>Doing</option><option value="done"' + (f.status === 'done' ? ' selected' : '') + '>Done</option></select>' +
    '<span style="flex:1"></span><button class="btn" onclick="openTaskForm()">+ New task</button>' +
  '</div>' +
  '<div class="board">' + col('todo', 'To Do') + col('doing', 'Doing') + col('done', 'Done') + '</div>' +
  '<p class="muted" style="margin-top:12px">Overdue tasks are flagged in red. Moving a task to Done records today as its completion date, so on-time vs late performance is always honest.</p>';
}

function moveTask(id, dir) {
  const t = state.tasks.find(x => x.id === id); if (!t) return;
  const order = ['todo', 'doing', 'done'];
  const next = order[Math.min(2, Math.max(0, order.indexOf(t.status) + dir))];
  const e = empById(t.assigneeId);
  if (next === 'done' && t.status !== 'done') { t.completedAt = todayISO(); logActivity((e ? e.name : 'Someone') + ' completed “' + t.title + '”' + (t.deadline && t.completedAt > t.deadline ? ' (' + Math.round((new Date(t.completedAt) - new Date(t.deadline)) / 864e5) + ' days late)' : '') + '.'); }
  if (next !== 'done') t.completedAt = '';
  t.status = next; save(); render();
}
function deleteTask(id) {
  const t = state.tasks.find(x => x.id === id); if (!t) return;
  if (!confirm('Delete task “' + t.title + '”?')) return;
  state.tasks = state.tasks.filter(x => x.id !== id);
  logActivity('Task deleted: “' + t.title + '”.'); save(); render();
}

/* ---------------- Goals helpers ---------------- */
function monthStart() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10); }
function goalTargetMonth() { return state.employees.reduce((s, e) => s + ((state.goals[e.id] && state.goals[e.id].tasksTarget) || 0), 0); }
function goalDoneMonth() { return state.tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= monthStart()).length; }
function setGoal(empId, val) {
  if (!state.goals[empId]) state.goals[empId] = {};
  state.goals[empId].tasksTarget = Math.max(0, parseInt(val, 10) || 0);
  save(); render();
}

/* ---------------- Clients ---------------- */
function viewClients() {
  const rows = state.clients.map(c => {
    const n = state.tasks.filter(t => t.clientId === c.id && t.status !== 'done').length;
    return '<tr class="clickable" onclick="setView(\'clients\',\'' + c.id + '\')"><td><b>' + esc(c.name) + '</b>' + (c.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + esc(c.service) + '</td><td>' + statusPill(c.status) + '</td><td>' + fmtDate(c.deadline) + '</td><td>' + (c.amount ? fmtINR(c.amount) + '/mo' : 'Not set') + '</td><td>' + n + ' open</td></tr>';
  }).join('');
  const prof = state.clients.map(c => {
    const rev = Number(c.amount) || 0;
    const cost = (c.demo && rev) ? Math.round(rev * 0.6) : null;
    const profit = cost !== null ? rev - cost : null;
    return '<tr><td>' + esc(c.name) + (c.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + (rev ? fmtINR(rev) : 'Not set') + '</td><td>' + (cost !== null ? fmtINR(cost) + ' (demo est.)' : '—') + '</td><td>' + (profit !== null ? fmtINR(profit) : '—') + '</td><td>' + (profit !== null ? Math.round(profit / rev * 100) + '%' : '—') + '</td></tr>';
  }).join('');
  const activeN = state.clients.filter(c => c.status === 'Active').length;
  const attention = state.clients.filter(c => {
    const od = state.tasks.some(t => t.clientId === c.id && isOverdue(t));
    const soon = c.deadline && c.deadline <= addDays(7) && c.deadline >= todayISO();
    return od || soon;
  });
  const retention = state.clients.length ? Math.round(activeN / state.clients.length * 100) : 0;
  const attList = attention.map(c => '<li><b>' + esc(c.name) + '</b> — ' + (state.tasks.some(t => t.clientId === c.id && isOverdue(t)) ? 'has overdue tasks' : 'deadline ' + fmtDate(c.deadline)) + '</li>').join('') || '<li class="muted">No client needs urgent attention this week.</li>';
  return '' +
  '<div class="card"><h3>Client health</h3><div class="stat-grid">' +
    '<div class="stat"><div class="slabel">Active clients</div><div class="svalue">' + activeN + ' / ' + state.clients.length + '</div></div>' +
    '<div class="stat"><div class="slabel">At-risk clients</div><div class="svalue">' + attention.length + '</div></div>' +
    '<div class="stat"><div class="slabel">Retention</div><div class="svalue">' + retention + '%</div></div></div>' +
  '<p class="muted">Needs attention this week:</p><ul class="feed">' + attList + '</ul></div>' +
  '<div class="toolbar"><span class="muted">' + state.clients.filter(c => c.status === 'Active').length + ' active clients · click a client for full detail</span><span style="flex:1"></span><button class="btn" onclick="openClientForm()">+ Add client</button></div>' +
  '<div class="card"><table><tr><th>Client</th><th>Service</th><th>Status</th><th>Project deadline</th><th>Amount</th><th>Tasks</th></tr>' + rows + '</table></div>' +
  '<div class="card"><h3>Client profitability ' + demoTag() + '</h3><p class="muted">Revenue is the monthly amount on the client record. Estimated cost is a demo figure (60% of revenue) for demo clients only — real client costs need actual salary and ad spend figures.</p>' +
  '<table><tr><th>Client</th><th>Revenue / mo</th><th>Est. cost / mo</th><th>Profit / mo</th><th>Margin</th></tr>' + prof + '</table></div>';
}

function viewClientDetail(id) {
  const c = clientById(id);
  if (!c) return '<p class="muted">Client not found.</p><button class="btn ghost" onclick="setView(\'clients\')">Back to clients</button>';
  const ct = state.tasks.filter(t => t.clientId === id);
  const open = ct.filter(t => t.status !== 'done').length;
  const res = c.results ? '<div class="stat-grid">' +
    '<div class="stat"><div class="slabel">Profile views</div><div class="svalue">' + c.results.profileViews.toLocaleString('en-IN') + '</div></div>' +
    '<div class="stat"><div class="slabel">Post impressions</div><div class="svalue">' + c.results.impressions.toLocaleString('en-IN') + '</div></div>' +
    '<div class="stat"><div class="slabel">Search appearances</div><div class="svalue">' + c.results.searchAppearances + '</div></div>' +
    '<div class="stat"><div class="slabel">Followers</div><div class="svalue">' + c.results.followers.toLocaleString('en-IN') + '</div></div></div>' +
    '<p class="muted">LinkedIn results from verified analytics. Update them when new analytics arrive.</p>' : '';
  const rows = ct.map(t => {
    const e = empById(t.assigneeId);
    return '<tr><td>' + esc(t.title) + '</td><td>' + esc(e ? e.name : '—') + '</td><td>' + fmtDate(t.deadline) + (isOverdue(t) ? ' <span class="overdue">OVERDUE</span>' : '') + '</td><td>' + statusPill(t.status === 'done' ? 'Done' : t.status === 'doing' ? 'Doing' : 'To Do') + '</td></tr>';
  }).join('');
  const rev = Number(c.amount) || 0;
  const profitLine = rev ? '<p class="muted">Revenue ' + fmtINR(rev) + '/mo' + (c.demo ? ' · demo estimated cost ' + fmtINR(Math.round(rev * 0.6)) + '/mo · profit ' + fmtINR(Math.round(rev * 0.4)) + '/mo' : ' · cost not recorded yet') + '</p>' : '';
  return '' +
  '<button class="btn ghost small" onclick="setView(\'clients\')">← Back to clients</button>' +
  '<div class="card" style="margin-top:14px"><div class="emp-row" style="border:none;padding:0"><div class="grow">' +
  '<div class="ename" style="font-size:19px">' + esc(c.name) + ' ' + (c.demo ? '<span class="pill amber">DEMO</span>' : '') + '</div>' +
  '<div class="emeta">' + esc(c.service) + ' · ' + esc(c.niche) + '</div></div>' +
  '<div>' + statusPill(c.status) + '</div>' +
  '<button class="btn" onclick="openClientForm(\'' + c.id + '\')">Edit client</button></div>' +
  '<div class="stat-grid"><div class="stat"><div class="slabel">Start date</div><div class="svalue" style="font-size:16px">' + fmtDate(c.startDate) + '</div></div>' +
  '<div class="stat"><div class="slabel">Project deadline</div><div class="svalue" style="font-size:16px">' + fmtDate(c.deadline) + '</div></div>' +
  '<div class="stat"><div class="slabel">Amount</div><div class="svalue" style="font-size:16px">' + (c.amount ? fmtINR(c.amount) + '/mo' : 'Not set') + '</div></div>' +
  '<div class="stat"><div class="slabel">Open tasks</div><div class="svalue">' + open + '</div></div></div>' + profitLine +
  '<p class="muted">' + esc(c.notes || '') + '</p></div>' +
  res +
  clientSocialHTML(c) +
  '<div class="card"><h3>Tasks for this client</h3>' + (ct.length ? '<table><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Status</th></tr>' + rows + '</table>' : '<p class="empty">No tasks for this client yet.</p>') + '</div>';
}

/* ---------------- Client social accounts & analytics (Sec. 6) ---------------- */
function setSocialPeriod(v) { socialPeriod = v; render(); }
function clientSocialHTML(c) {
  const accounts = c.social || [];
  const periodSelect = '<select onchange="setSocialPeriod(this.value)" style="width:auto"><option value="30d"' + (socialPeriod === '30d' ? ' selected' : '') + '>Last 30 days</option><option value="7d"' + (socialPeriod === '7d' ? ' selected' : '') + '>Last 7 days</option></select>';
  if (!accounts.length) {
    return '<div class="card"><h3>Social accounts</h3><p class="muted">No social accounts added for this client yet.</p>' +
    '<div class="btnrow" style="margin-top:10px"><button class="btn" onclick="openClientForm(\'' + c.id + '\')">+ Add link</button></div>' +
    '<p class="muted" style="margin-top:10px">Add each profile link here, then monitor followers, reach and engagement. Metrics are entered manually — live platform sync needs the client’s official authorization (Sec. 6).</p></div>';
  }
  const cards = accounts.map(a => {
    const m = socialMetrics(a, socialPeriod);
    const er = m ? engRate(m) : 0;
    const metricsHTML = m ?
      '<div class="stat-grid">' +
      '<div class="stat"><div class="slabel">Followers</div><div class="svalue">' + (m.followers || 0).toLocaleString('en-IN') + '</div><div class="slabel">Change: ' + trendHTML(m.followers, m.prevFollowers) + '</div></div>' +
      '<div class="stat"><div class="slabel">Reach</div><div class="svalue">' + (m.reach || 0).toLocaleString('en-IN') + '</div><div class="slabel">Prev: ' + (m.prevReach || 0).toLocaleString('en-IN') + '</div></div>' +
      '<div class="stat"><div class="slabel">Impressions</div><div class="svalue">' + (m.impressions || 0).toLocaleString('en-IN') + '</div></div>' +
      '<div class="stat"><div class="slabel">Engagement</div><div class="svalue">' + (m.engagement || 0).toLocaleString('en-IN') + '</div><div class="slabel">Rate: ' + er.toFixed(1) + '%</div></div>' +
      '<div class="stat"><div class="slabel">Posts</div><div class="svalue">' + (m.posts || 0) + '</div></div>' +
      '<div class="stat"><div class="slabel">Last updated</div><div class="svalue" style="font-size:15px">' + fmtDT(m.updatedAt) + '</div></div></div>'
      : '<p class="muted">No metrics entered for this period yet — use “Update metrics” to add them manually.</p>';
    return '<div class="card" style="margin-top:12px"><div class="emp-row" style="border:none;padding:0"><div class="grow"><b>' + esc(a.platform) + '</b> ' + (a.demo ? '<span class="pill amber">DEMO</span>' : '') + ' <span class="pill ' + (a.status === 'Manual entry' ? 'grey' : 'amber') + '">' + esc(a.status) + '</span><div class="emeta">' + esc(a.handle || '—') + '</div></div>' +
      (a.url ? '<a class="btn small" href="' + esc(a.url) + '" target="_blank" rel="noopener">Open ↗</a>' : '') +
      '<button class="btn ghost small" onclick="openSocialConnect(\'' + c.id + '\',\'' + a.id + '\')">How to connect</button>' +
      '<button class="btn small" onclick="openMetricsForm(\'' + c.id + '\',\'' + a.id + '\')">Update metrics</button></div>' +
      (a.url ? '<p class="muted" style="margin-top:8px"><a href="' + esc(a.url) + '" target="_blank" rel="noopener" style="color:var(--lime)">' + esc(a.url) + '</a></p>' : '<p class="muted" style="margin-top:8px">No profile link yet — edit the client to add one.</p>') +
      metricsHTML + '</div>';
  }).join('');
  return '<div class="card"><h3>Social accounts &amp; analytics <span class="pill amber">MANUAL ENTRY</span></h3>' +
    '<div class="toolbar"><span class="muted">Metrics are entered by hand — live platform sync needs the client’s official authorization (Sec. 6).</span><span style="flex:1"></span>' + periodSelect +
    '<button class="btn ghost small" onclick="openClientForm(\'' + c.id + '\')">Manage accounts</button></div>' + cards + '</div>';
}
function openSocialConnect(clientId, accountId) {
  const c = clientById(clientId); if (!c) return;
  const a = (c.social || []).find(x => x.id === accountId); if (!a) return;
  openModal('<h2>Connect ' + esc(a.platform) + '</h2>' +
    '<p class="muted">Account: <b>' + esc(a.handle || '—') + '</b> · Status: <b>' + esc(a.status) + '</b></p>' +
    (a.url ? '<p><a href="' + esc(a.url) + '" target="_blank" rel="noopener" style="color:var(--lime)">' + esc(a.url) + '</a></p>' : '') +
    '<div class="note"><b>Live sync needs the client’s authorization:</b><br>1. The client logs in to ' + esc(a.platform) + ' and authorises this dashboard (OAuth) — passwords are never collected here.<br>2. Only then can followers, reach and engagement load live.<br>3. Until then, every number on this page is a manual entry, clearly labeled — it is never a live platform figure.</div>' +
    '<div class="btnrow">' + (a.url ? '<a class="btn" href="' + esc(a.url) + '" target="_blank" rel="noopener">Open profile ↗</a>' : '') + '<button class="btn ghost" onclick="closeModal()">Close</button></div>');
}
function openMetricsForm(clientId, accountId) {
  const c = clientById(clientId); if (!c) return;
  const a = (c.social || []).find(x => x.id === accountId); if (!a) return;
  const m = socialMetrics(a, socialPeriod) || {};
  const num = v => (v == null ? '' : v);
  openModal('<h2>Update metrics — ' + esc(a.platform) + '</h2>' +
    '<p class="muted">' + esc(c.name) + ' · ' + esc(a.handle || '') + ' · period: <b>' + (socialPeriod === '7d' ? 'Last 7 days' : 'Last 30 days') + '</b></p>' +
    '<form onsubmit="saveMetrics(event,\'' + clientId + '\',\'' + accountId + '\')">' +
    '<div class="form-grid"><div><label>Followers (now)</label><input id="m-followers" type="number" min="0" value="' + num(m.followers) + '"></div>' +
    '<div><label>Followers (previous period)</label><input id="m-prev-followers" type="number" min="0" value="' + num(m.prevFollowers) + '"></div></div>' +
    '<div class="form-grid"><div><label>Reach (this period)</label><input id="m-reach" type="number" min="0" value="' + num(m.reach) + '"></div>' +
    '<div><label>Reach (previous period)</label><input id="m-prev-reach" type="number" min="0" value="' + num(m.prevReach) + '"></div></div>' +
    '<div class="form-grid"><div><label>Impressions</label><input id="m-impressions" type="number" min="0" value="' + num(m.impressions) + '"></div>' +
    '<div><label>Engagement (likes + comments + shares + saves)</label><input id="m-engagement" type="number" min="0" value="' + num(m.engagement) + '"></div></div>' +
    '<div class="form-grid"><div><label>Posts published</label><input id="m-posts" type="number" min="0" value="' + num(m.posts) + '"></div></div>' +
    '<p class="muted" style="margin-top:10px">Manual entry — these numbers come from the client’s platform analytics, typed in by hand. The last-updated time is saved with them.</p>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save metrics</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveMetrics(ev, clientId, accountId) {
  ev.preventDefault();
  const c = clientById(clientId); if (!c) return;
  const a = (c.social || []).find(x => x.id === accountId); if (!a) return;
  const n = id => Number($(id).value) || 0;
  a.metrics = a.metrics || {};
  a.metrics[socialPeriod] = { followers: n('#m-followers'), prevFollowers: n('#m-prev-followers'), reach: n('#m-reach'), prevReach: n('#m-prev-reach'), impressions: n('#m-impressions'), engagement: n('#m-engagement'), posts: n('#m-posts'), updatedAt: new Date().toISOString() };
  logActivity('Metrics updated for ' + c.name + ' — ' + a.platform + ' (' + (socialPeriod === '7d' ? 'last 7 days' : 'last 30 days') + ').');
  save(); closeModal(); render();
}

/* ---------------- Meta Ads ---------------- */
/* ---------------- Paid Ads (Sec. 9) ---------------- */
function viewAds() {
  const budget = state.campaigns.reduce((s, c) => s + (c.budget || 0), 0);
  const spend = state.campaigns.reduce((s, c) => s + c.spend, 0);
  const reach = state.campaigns.reduce((s, c) => s + c.reach, 0);
  const leads = state.campaigns.reduce((s, c) => s + c.leads, 0);
  const convs = state.campaigns.reduce((s, c) => s + (c.conversions || 0), 0);
  const rows = state.campaigns.map(c => {
    const cpa = c.conversions ? Math.round(c.spend / c.conversions) : 0;
    const roas = c.spend ? (state.marketing.filter(m => m.name === c.name).reduce((s, m) => s + m.revenue, 0) / c.spend).toFixed(1) + 'x' : '—';
    const over = c.budget && c.spend > c.budget;
    return '<tr><td><b>' + esc(c.name) + '</b> ' + demoTag() + '</td><td>' + esc(c.platform) + '</td><td>' + fmtINR(c.budget || 0) + '</td><td>' + fmtINR(c.spend) + (over ? ' <span class="overdue">OVER BUDGET</span>' : '') + '</td><td>' + c.reach.toLocaleString('en-IN') + '</td><td>' + c.leads + '</td><td>' + (c.conversions || 0) + '</td><td>' + fmtINR(cpa) + '</td><td>' + roas + '</td><td>' + statusPill(c.status) + '</td><td><button class="btn danger small" onclick="deleteCampaign(\'' + c.id + '\')">Delete</button></td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total budget ' + demoTag() + '</div><div class="value">' + fmtINR(budget) + '</div><div class="sub">across ' + state.campaigns.length + ' campaigns</div></div>' +
    '<div class="card kpi"><div class="label">Total spend ' + demoTag() + '</div><div class="value">' + fmtINR(spend) + '</div><div class="sub">' + Math.round(budget ? spend / budget * 100 : 0) + '% of budget used</div></div>' +
    '<div class="card kpi"><div class="label">Leads / conversions ' + demoTag() + '</div><div class="value">' + leads + ' / ' + convs + '</div><div class="sub">cost per conversion ' + fmtINR(convs ? Math.round(spend / convs) : 0) + '</div></div>' +
    '<div class="card kpi"><div class="label">Total reach ' + demoTag() + '</div><div class="value">' + reach.toLocaleString('en-IN') + '</div><div class="sub">people reached</div></div>' +
  '</div>' +
  '<div class="card"><h3>Campaigns</h3><table><tr><th>Campaign</th><th>Platform</th><th>Budget</th><th>Spend</th><th>Reach</th><th>Leads</th><th>Conv.</th><th>CPA</th><th>ROAS</th><th>Status</th><th></th></tr>' + rows + '</table>' +
  '<p class="muted">Media spend is shown separately from agency fees (Sec. 9). CPA = spend / conversions. ROAS uses attributed revenue from the Marketing page. Campaigns spending over their approved budget are flagged — budget changes need CEO approval.</p></div>' +
  '<div class="card"><h3>Add a campaign</h3><form onsubmit="addCampaign(event)">' +
  '<div class="form-grid"><div><label>Campaign name</label><input id="cp-name" required placeholder="e.g. LinkedIn Growth — Lead Gen"></div>' +
  '<div><label>Platform</label><select id="cp-platform"><option>Meta</option><option>Google</option><option>LinkedIn</option></select></div></div>' +
  '<div class="form-grid"><div><label>Budget (₹)</label><input id="cp-budget" type="number" min="0" required></div>' +
  '<div><label>Spend so far (₹)</label><input id="cp-spend" type="number" min="0" value="0"></div></div>' +
  '<div class="form-grid"><div><label>Reach</label><input id="cp-reach" type="number" min="0" value="0"></div>' +
  '<div><label>Leads</label><input id="cp-leads" type="number" min="0" value="0"></div></div>' +
  '<div class="form-grid"><div><label>Conversions</label><input id="cp-conv" type="number" min="0" value="0"></div>' +
  '<div><label>Status</label><select id="cp-status"><option>Active</option><option>Paused</option></select></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add campaign</button></div></form></div>' +
  '<div class="card"><h3>Connect Meta Ads</h3><p class="muted">Every number on this page is demo data. Real spend, reach and leads appear only after you connect your Meta Business account — Meta does not share ad data without an official login.</p><button class="btn" onclick="openAdsConnect()">How to connect Meta Ads</button></div>';
}

/* ---------------- Connections — Raj's real accounts (Sec. 6) ---------------- */
function viewConnections() {
  const rows = state.connections.map(c =>
    '<div class="conn-row"><div class="conn-icon">' + esc(c.platform[0]) + '</div>' +
      '<div class="grow"><b>' + esc(c.platform) + '</b> <span class="muted">' + esc(c.handle) + '</span>' +
      '<div class="muted"><a href="' + esc(c.url) + '" target="_blank" rel="noopener" style="color:var(--lime)">' + esc(c.url) + '</a></div></div>' +
      '<div><span class="pill green">' + esc(c.status) + '</span></div>' +
      '<a class="btn small" href="' + esc(c.url) + '" target="_blank" rel="noopener">Open ↗</a></div>'
  ).join('');
  return '' +
  '<div class="card"><h3>Connected accounts — Synced from GitHub profile</h3>' + rows + '</div>' +
  '<div class="card"><h3>Quick links</h3>' + socialGridHTML() + '</div>' +
  '<div class="note"><b>Honest note:</b> these are Raj’s real profile links from his GitHub “Let’s Connect” section. Live follower counts and post stats are not shown here — real live numbers need the official login for each platform, and this static demo does not pull them. If a link changes on the GitHub profile, update it here in Settings → Connections.</div>';
}

/* ---------------- Deadlines ---------------- */
function viewDeadlines() {
  const items = [];
  state.tasks.filter(t => t.status !== 'done' && t.deadline).forEach(t => items.push({ date: t.deadline, label: t.title, who: (empById(t.assigneeId) || {}).name || 'Unassigned', kind: 'Task', id: t.id }));
  state.clients.filter(c => c.deadline).forEach(c => items.push({ date: c.deadline, label: c.name + ' — project deadline', who: c.service, kind: 'Client', id: c.id }));
  items.sort((a, b) => a.date.localeCompare(b.date));
  const rows = items.map(it => {
    const od = it.date < todayISO(), today = it.date === todayISO();
    return '<div class="deadline-row"><div style="min-width:110px"><b class="' + (od ? 'overdue' : '') + '">' + fmtDate(it.date) + '</b></div>' +
      '<div class="grow"><b>' + esc(it.label) + '</b><div class="muted">' + esc(it.who) + ' · ' + it.kind + '</div></div>' +
      '<div>' + (od ? '<span class="pill red">Overdue</span>' : today ? '<span class="pill amber">Due today</span>' : '<span class="pill blue">Upcoming</span>') + '</div></div>';
  }).join('');
  return '<div class="card"><h3>All deadlines — soonest first</h3>' + (rows || '<p class="empty">No deadlines set. Add deadlines on tasks and clients.</p>') + '</div>';
}

/* ---------------- Attendance & Leave ---------------- */
function attToday(empId) {
  const rec = (state.attendance[todayISO()] || {})[empId];
  if (rec) return rec;
  const e = empById(empId);
  return e.status === 'Working' ? 'Present' : e.status === 'On leave' ? 'On leave' : 'Absent';
}
function setAttendance(empId, val) {
  const day = todayISO();
  if (!state.attendance[day]) state.attendance[day] = {};
  state.attendance[day][empId] = val;
  const e = empById(empId);
  e.status = val === 'Present' || val === 'Late' ? 'Working' : val === 'On leave' ? 'On leave' : 'Offline';
  logActivity(e.name + ' marked ' + val + ' for today.');
  save(); render();
}
function viewAttendance() {
  const rows = state.employees.map(e => {
    const cur = attToday(e.id);
    const opts = ['Present', 'Late', 'On leave', 'Absent'].map(o => '<option' + (o === cur ? ' selected' : '') + '>' + o + '</option>').join('');
    return '<tr><td><b>' + esc(e.name) + '</b></td><td>' + esc(e.role) + '</td><td><select onchange="setAttendance(\'' + e.id + '\', this.value)" style="max-width:170px">' + opts + '</select></td><td>' + statusPill(e.status) + '</td></tr>';
  }).join('');
  const lr = state.leaveRequests.map(r => {
    const e = empById(r.empId);
    return '<div class="deadline-row"><div class="grow"><b>' + esc(e ? e.name : '—') + '</b><div class="muted">' + fmtDate(r.from) + ' → ' + fmtDate(r.to) + ' · ' + esc(r.reason) + '</div></div>' +
      '<div>' + statusPill(r.status === 'Approved' ? 'Active' : r.status === 'Rejected' ? 'Paused' : 'To Do').replace(/Active|Paused|To Do/g, m => r.status) + '</div>' +
      (r.status === 'Pending' ? '<div class="btnrow"><button class="btn small" onclick="decideLeave(\'' + r.id + '\',\'Approved\')">Approve</button><button class="btn danger small" onclick="decideLeave(\'' + r.id + '\',\'Rejected\')">Reject</button></div>' : '') + '</div>';
  }).join('');
  return '' +
  '<div class="card"><h3>Attendance — today, ' + fmtDate(todayISO()) + '</h3><table><tr><th>Teammate</th><th>Role</th><th>Attendance</th><th>Status</th></tr>' + rows + '</table>' +
  '<p class="muted">Changing attendance also updates the teammate’s working status on the Team page.</p></div>' +
  '<div class="card"><h3>Leave requests</h3>' + (lr || '<p class="empty">No leave requests.</p>') +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" onclick="openLeaveForm()">+ New leave request</button></div></div>';
}
function decideLeave(id, verdict) {
  const r = state.leaveRequests.find(x => x.id === id); if (!r) return;
  r.status = verdict;
  const e = empById(r.empId);
  logActivity('Leave request ' + verdict.toLowerCase() + ' for ' + (e ? e.name : 'teammate') + ' (' + r.from + ' → ' + r.to + ').');
  save(); render();
}

/* ---------------- Performance ---------------- */
const ROLE_SALARY = { 'Content Writer': 35000, 'Video Editor': 45000, 'Social Media Executive': 30000, 'Ads Specialist': 50000, 'Graphic Designer': 40000 };
function viewPerformance() {
  const done = state.tasks.filter(t => t.status === 'done');
  const onTime = onTimeDone(done), late = lateDone(done);
  const rate = done.length ? Math.round(onTime / done.length * 100) : 0;
  const atRisk = state.employees.filter(e => {
    const d = doneTasksOf(e.id);
    const r = d.length ? onTimeDone(d) / d.length * 100 : 100;
    return tasksOf(e.id).some(isOverdue) || r < 60;
  }).length;
  const rows = state.employees.map(e => {
    const d = doneTasksOf(e.id), o = openTasksOf(e.id);
    const total = d.length + o.length;
    const comp = total ? Math.round(d.length / total * 100) : 0;
    const ot = d.length ? Math.round(onTimeDone(d) / d.length * 100) : 100;
    const md = d.filter(t => t.completedAt && t.completedAt >= monthStart()).length;
    const target = (state.goals[e.id] && state.goals[e.id].tasksTarget) || 0;
    const flag = tasksOf(e.id).some(isOverdue) || ot < 60 ? '<span class="pill red">At risk</span>' : '<span class="pill green">On track</span>';
    return '<tr><td><b>' + esc(e.name) + '</b></td><td>' + d.length + '</td><td>' + onTimeDone(d) + '</td><td>' + lateDone(d) + '</td><td>' + comp + '%</td><td>' + (d.length ? ot + '%' : '—') + '</td><td>' + md + ' / ' + target + '</td><td>' + flag + '</td></tr>';
  }).join('');
  const costRows = Object.keys(ROLE_SALARY).map(role => {
    const n = state.employees.filter(e => e.role === role).length;
    if (!n) return '';
    return '<tr><td>' + esc(role) + '</td><td>' + n + '</td><td>' + fmtINR(ROLE_SALARY[role]) + '</td><td>' + fmtINR(ROLE_SALARY[role] * n) + '</td></tr>';
  }).join('');
  const totalCost = state.employees.reduce((s, e) => s + (ROLE_SALARY[e.role] || 30000), 0);
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Company on-time rate</div><div class="value lime">' + rate + '%</div><div class="sub">' + onTime + ' on time · ' + late + ' late (of ' + done.length + ' completed)</div></div>' +
    '<div class="card kpi"><div class="label">Monthly goal</div><div class="value">' + goalDoneMonth() + ' / ' + goalTargetMonth() + '</div><div class="sub">tasks completed this month vs team target</div></div>' +
    '<div class="card kpi"><div class="label">Teammates at risk</div><div class="value">' + atRisk + '</div><div class="sub">overdue tasks or on-time rate below 60%</div></div>' +
  '</div>' +
  '<div class="card"><h3>Performance by teammate</h3><table><tr><th>Teammate</th><th>Done</th><th>On time</th><th>Late</th><th>Completion</th><th>On-time rate</th><th>Monthly goal</th><th>Flag</th></tr>' + rows + '</table>' +
  '<p class="muted">On track: no overdue tasks and on-time rate 60% or higher. At risk: has an overdue task or on-time rate below 60%. Monthly goals are editable on each teammate’s detail page.</p></div>' +
  '<div class="card"><h3>Team cost — monthly ' + demoTag() + '</h3><p class="muted">Demo salary figures per role. Replace them with real salaries to get a true monthly cost.</p>' +
  '<table><tr><th>Role</th><th>People</th><th>Salary / person</th><th>Monthly cost</th></tr>' + costRows + '</table>' +
  '<p style="margin-top:10px"><b>Total team cost: ' + fmtINR(totalCost) + ' / month (demo)</b></p></div>';
}

/* ---------------- Workload ---------------- */
function viewWorkload() {
  const CAP = (state.settings && state.settings.capacity) || 5;
  const rows = state.employees.map(e => {
    const open = openTasksOf(e.id).length;
    const pct = Math.min(100, Math.round(open / CAP * 100));
    const wl = workload(e.id);
    return '<tr><td><b>' + esc(e.name) + '</b><div class="muted">' + esc(e.role) + '</div></td><td>' + open + ' / ' + CAP + '</td>' +
      '<td style="min-width:180px"><div class="progress"><i style="width:' + pct + '%;background:' + (wl.cls === 'red' ? 'var(--red)' : wl.cls === 'green' ? 'var(--green)' : 'var(--blue)') + '"></i></div></td>' +
      '<td><span class="pill ' + wl.cls + '">' + wl.label + '</span></td></tr>';
  }).sort((a, b) => 0).join('');
  const sorted = [...state.employees].sort((a, b) => openTasksOf(b.id).length - openTasksOf(a.id).length);
  const body = sorted.map(e => {
    const open = openTasksOf(e.id).length;
    const pct = Math.min(100, Math.round(open / CAP * 100));
    const wl = workload(e.id);
    return '<tr><td><b>' + esc(e.name) + '</b><div class="muted">' + esc(e.role) + '</div></td><td>' + open + ' / ' + CAP + '</td>' +
      '<td style="min-width:180px"><div class="progress"><i style="width:' + pct + '%;background:' + (wl.cls === 'red' ? 'var(--red)' : wl.cls === 'green' ? 'var(--green)' : 'var(--blue)') + '"></i></div></td>' +
      '<td><span class="pill ' + wl.cls + '">' + wl.label + '</span></td></tr>';
  }).join('');
  const free = sorted.filter(e => openTasksOf(e.id).length <= 1).map(e => esc(e.name)).join(', ') || 'Nobody';
  const over = sorted.filter(e => openTasksOf(e.id).length >= CAP).map(e => esc(e.name)).join(', ') || 'Nobody';
  return '' +
  '<div class="card"><h3>Open tasks per teammate (capacity ' + CAP + ')</h3><table><tr><th>Teammate</th><th>Open tasks</th><th>Load</th><th>Status</th></tr>' + body + '</table>' +
  '<p class="muted" style="margin-top:10px">Free right now (0–1 open tasks): <b>' + free + '</b><br>Overloaded (' + CAP + '+ open tasks): <b>' + over + '</b></p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" onclick="openTaskForm()">Assign a task</button></div></div>' +
  '<div class="note"><b>How to read this:</b> give new work to people marked Available or Balanced first. Anyone at 5+ open tasks is overloaded — move a task to someone free, or extend its deadline.</div>';
}

/* ---------------- Activity log ---------------- */
function viewActivity() {
  const opts = state.employees.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
  const items = state.activity.map(a => '<li>' + esc(a.text) + ' <span class="ftime">' + fmtDate(a.at.slice(0, 10)) + ' ' + timeHM(a.at) + '</span></li>').join('') || '<li class="muted">No activity yet.</li>';
  return '' +
  '<div class="card"><h3>Log work</h3><form onsubmit="addManualActivity(event)"><div class="form-grid">' +
  '<div><label>Teammate</label><select id="al-emp">' + opts + '</select></div>' +
  '<div><label>What did they work on?</label><input id="al-text" required placeholder="e.g. Shot and edited 2 reels for FitLife"></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add entry</button></div></form></div>' +
  '<div class="card"><h3>Chronological log</h3><ul class="feed">' + items + '</ul><p class="muted">Task status changes are added here automatically. Manual entries record work that is not a task.</p></div>';
}
function addManualActivity(ev) {
  ev.preventDefault();
  const e = empById($('#al-emp').value);
  const text = $('#al-text').value.trim();
  if (!text) return;
  state.activity.unshift({ id: uid(), text: (e ? e.name : 'Teammate') + ': ' + text, at: new Date().toISOString() });
  state.activity = state.activity.slice(0, 40);
  save(); render();
}

/* ---------------- Settings ---------------- */
/* ---------------- Settings (Sec. 2 roles, Sec. 20 governance) ---------------- */
const ROLES = [
  ['CEO / Founder', 'Agency-wide KPIs, client portfolio, profitability, approvals, strategic reports.'],
  ['Agency Admin', 'Users, roles, workspace configuration, templates, integrations.'],
  ['Account Manager', 'Assigned clients, briefs, communication, timelines, approvals, renewals.'],
  ['Project Manager', 'Project plans, tasks, workload, deadlines, delivery quality.'],
  ['Social Media Manager', 'Social calendars, account data, post workflows, publishing.'],
  ['Content Strategist', 'Research, content plans, briefs, copy review, performance insights.'],
  ['Designer / Video Editor', 'Creative briefs, assets, revisions, final files.'],
  ['SEO Specialist', 'Audits, keywords, technical tasks, rankings, content optimization.'],
  ['Ads Specialist', 'Ad accounts, campaigns, budgets, performance, experiments.'],
  ['Sales Executive', 'Leads, qualification, calls, proposals, follow-ups.'],
  ['Finance Manager', 'Invoices, expenses, collections, budgets, profitability.'],
  ['HR / Operations', 'Employee records, attendance, leave, recruitment, policies.'],
  ['Client', 'Own contracts, briefs, content approvals, reports, invoices, requests.'],
];
function viewSettings() {
  const roleRows = ROLES.map(r => '<tr><td><b>' + esc(r[0]) + '</b></td><td>' + esc(r[1]) + '</td></tr>').join('');
  return '' +
  '<div class="card"><h3>Agency settings</h3><form onsubmit="saveSettings(event)">' +
  '<label>Agency name</label><input id="set-agency" value="' + esc(state.settings.agencyName) + '">' +
  '<label>CEO name</label><input id="set-ceo" value="' + esc(state.settings.ceoName) + '">' +
  '<div class="form-grid"><div><label>Currency</label><select id="set-cur"><option' + (state.settings.currency === '₹' ? ' selected' : '') + '>₹</option><option' + (state.settings.currency === '$' ? ' selected' : '') + '>$</option><option' + (state.settings.currency === '€' ? ' selected' : '') + '>€</option></select></div>' +
  '<div><label>Team capacity — open tasks per person</label><input id="set-cap" type="number" min="1" max="20" value="' + ((state.settings && state.settings.capacity) || 5) + '"></div></div>' +
  '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save settings</button></div></form></div>' +
  '<div class="card"><h3>Roles &amp; permissions — Sec. 2</h3><p class="muted">Role-based access: employees see only assigned clients unless their role requires more. Clients see only their own workspace. Financial exports and budget changes need explicit permission.</p><table style="margin-top:10px"><tr><th>Role</th><th>Responsibilities and access</th></tr>' + roleRows + '</table></div>' +
  '<div class="card"><h3>Login &amp; security</h3><p class="muted">This dashboard uses a demo login stored only in this browser (localStorage). It is not real server security — anyone with access to this browser can open the app. ' + (getCreds() ? 'A login is set for this browser.' : 'No login is set yet — you will be asked to create one on your next visit.') + '</p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn ghost" onclick="logout()">Logout</button><button class="btn danger" onclick="resetLogin()">Reset login (clear saved credentials)</button></div></div>' +
  '<div class="card"><h3>Data</h3><p class="muted">Everything is stored in this browser (localStorage). Demo employees, clients, campaigns and salary figures are marked DEMO — replace them with real records from the Team, Clients and Tasks pages. Real Meta Ads and social numbers need the official account connections on the Meta Ads and Connections pages.</p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn danger" onclick="resetDemo()">Reset demo data</button></div></div>';
}
function saveSettings(ev) {
  ev.preventDefault();
  state.settings.agencyName = $('#set-agency').value.trim() || 'My Agency';
  state.settings.ceoName = $('#set-ceo').value.trim() || 'CEO';
  state.settings.currency = $('#set-cur').value;
  state.settings.capacity = Math.max(1, Math.min(20, parseInt($('#set-cap').value, 10) || 5));
  save(); render();
}
function resetDemo() {
  if (!confirm('Reset all data back to the original demo data? Your changes will be lost.')) return;
  localStorage.removeItem(LS_KEY); load(); setView('overview');
}

/* ---------------- Modals ---------------- */
function openModal(html) { $('#modal-root').innerHTML = '<div class="modal-back" onclick="if(event.target===this)closeModal()"><div class="modal">' + html + '</div></div>'; }
function closeModal() { $('#modal-root').innerHTML = ''; }

function openTaskForm(id) {
  const t = id ? state.tasks.find(x => x.id === id) : null;
  const empOpts = state.employees.map(e => '<option value="' + e.id + '"' + (t && t.assigneeId === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('');
  const cliOpts = '<option value="">No client</option>' + state.clients.map(c => '<option value="' + c.id + '"' + (t && t.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
  const projOpts = '<option value="">No project</option>' + state.projects.map(p => '<option value="' + p.id + '"' + (t && t.projectId === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');
  openModal('<h2>' + (t ? 'Edit task' : 'New task') + '</h2><form onsubmit="saveTask(event,\'' + (id || '') + '\')">' +
    '<label>Title</label><input id="f-title" required value="' + esc(t ? t.title : '') + '">' +
    '<div class="form-grid"><div><label>Assign to</label><select id="f-assignee">' + empOpts + '</select></div>' +
    '<div><label>Client</label><select id="f-client">' + cliOpts + '</select></div></div>' +
    '<label>Project</label><select id="f-project">' + projOpts + '</select>' +
    '<div class="form-grid"><div><label>Deadline</label><input id="f-deadline" type="date" value="' + (t ? t.deadline : '') + '"></div>' +
    '<div><label>Priority</label><select id="f-priority"><option' + (t && t.priority === 'High' ? ' selected' : '') + '>High</option><option' + (!t || t.priority === 'Medium' ? ' selected' : '') + '>Medium</option><option' + (t && t.priority === 'Low' ? ' selected' : '') + '>Low</option></select></div></div>' +
    '<label>Status</label><select id="f-status"><option value="todo"' + (!t || t.status === 'todo' ? ' selected' : '') + '>To Do</option><option value="doing"' + (t && t.status === 'doing' ? ' selected' : '') + '>Doing</option><option value="done"' + (t && t.status === 'done' ? ' selected' : '') + '>Done</option></select>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save task</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveTask(ev, id) {
  ev.preventDefault();
  const title = $('#f-title').value.trim();
  const assigneeId = $('#f-assignee').value, clientId = $('#f-client').value;
  const projectId = $('#f-project') ? $('#f-project').value : '';
  const deadline = $('#f-deadline').value, priority = $('#f-priority').value, status = $('#f-status').value;
  const e = empById(assigneeId);
  if (id) {
    const t = state.tasks.find(x => x.id === id); if (!t) return;
    const wasDone = t.status === 'done';
    Object.assign(t, { title, assigneeId, clientId, projectId, deadline, priority, status });
    if (status === 'done' && !wasDone) t.completedAt = todayISO();
    if (status !== 'done') t.completedAt = '';
    logActivity('Task updated: “' + title + '” (' + (e ? e.name : '') + ').');
  } else {
    state.tasks.unshift({ id: uid(), title, assigneeId, clientId, projectId, deadline, priority, status, completedAt: status === 'done' ? todayISO() : '', createdAt: todayISO() });
    logActivity('New task assigned to ' + (e ? e.name : 'teammate') + ': “' + title + '”.');
  }
  save(); closeModal(); render();
}

function openEmployeeForm(id) {
  const e = id ? state.employees.find(x => x.id === id) : null;
  const teamId = e ? (e.teamId || '') : nextTeamId();
  openModal('<h2>' + (e ? 'Edit teammate' : 'Add teammate') + '</h2><form onsubmit="saveEmployee(event,\'' + (id || '') + '\')">' +
    '<label>Name</label><input id="e-name" required placeholder="e.g. Rahul Kumar" value="' + esc(e ? e.name : '') + '">' +
    '<div class="form-grid"><div><label>Team ID</label><input id="e-teamid" required value="' + esc(teamId) + '"></div>' +
    '<div><label>Team / group</label><input id="e-team" placeholder="e.g. Content" value="' + esc(e ? (e.team || '') : '') + '"></div></div>' +
    '<div class="form-grid"><div><label>Phone / WhatsApp number</label><input id="e-phone" type="tel" placeholder="e.g. +91 98765 43210" value="' + esc(e ? (e.phone || '') : '') + '"></div>' +
    '<div><label>Role</label><input id="e-role" required placeholder="e.g. SEO Executive" value="' + esc(e ? e.role : '') + '"></div></div>' +
    '<label>Status</label><select id="e-status"><option' + (e && e.status === 'Working' ? ' selected' : '') + '>Working</option><option' + (e && e.status === 'On leave' ? ' selected' : '') + '>On leave</option><option' + (e && e.status === 'Offline' ? ' selected' : '') + '>Offline</option></select>' +
    '<label>Responsibilities (one per line)</label><textarea id="e-resp" rows="3" placeholder="LinkedIn outreach&#10;Client reporting">' + esc(e ? e.responsibilities.join('\n') : '') + '</textarea>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">' + (e ? 'Save changes' : 'Add teammate') + '</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveEmployee(ev, id) {
  ev.preventDefault();
  const colors = ['#2997ff', '#a259ff', '#2fd47c', '#ffb547', '#ff5f6d', '#ff8a5c'];
  const resp = $('#e-resp').value.split('\n').map(s => s.trim()).filter(Boolean);
  const data = { name: $('#e-name').value.trim(), role: $('#e-role').value.trim(), status: $('#e-status').value, responsibilities: resp.length ? resp : ['General agency work'], teamId: $('#e-teamid').value.trim(), team: $('#e-team').value.trim() || 'General', phone: $('#e-phone').value.trim() };
  if (id) { const e = state.employees.find(x => x.id === id); if (!e) return; Object.assign(e, data); logActivity('Teammate updated: ' + data.name + ' (' + data.teamId + ').'); }
  else { state.employees.push(Object.assign({ id: uid(), color: colors[state.employees.length % colors.length], demo: false }, data)); logActivity('New teammate added: ' + data.name + ' (' + data.teamId + ').'); }
  save(); closeModal(); render();
}
function deleteEmployee(id) {
  const e = state.employees.find(x => x.id === id); if (!e) return;
  const open = openTasksOf(id).length;
  if (!confirm('Remove ' + e.name + ' (' + (e.teamId || 'no ID') + ')?' + (open ? ' Their ' + open + ' open task' + (open === 1 ? '' : 's') + ' will become Unassigned.' : ''))) return;
  state.tasks.forEach(t => { if (t.assigneeId === id) t.assigneeId = ''; });
  if (state.goals[id]) delete state.goals[id];
  state.employees = state.employees.filter(x => x.id !== id);
  logActivity('Teammate removed: ' + e.name + ' (' + (e.teamId || 'no ID') + ').');
  save(); setView('team'); render();
}

/* Client form social rows — draft lives only while the modal is open;
   metrics stay on the saved account record and are merged back by id. */
let clientSocialDraft = [];
function socialRowHTML(a, i) {
  const platOpts = SOCIAL_PLATFORMS.map(p => '<option' + (a.platform === p ? ' selected' : '') + '>' + p + '</option>').join('');
  return '<div class="sa-row" data-id="' + esc(a.id) + '">' +
    '<div><label>Platform</label><select class="sa-platform">' + platOpts + '</select></div>' +
    '<div><label>Handle</label><input class="sa-handle" value="' + esc(a.handle || '') + '" placeholder="@handle"></div>' +
    '<div><label>Profile URL</label><input class="sa-url" value="' + esc(a.url || '') + '" placeholder="https://…"></div>' +
    '<div><label>Status</label><select class="sa-status"><option' + (a.status === 'Manual entry' ? ' selected' : '') + '>Manual entry</option><option' + (a.status === 'Not connected' ? ' selected' : '') + '>Not connected</option></select></div>' +
    '<div class="sa-x"><button class="btn danger small" type="button" onclick="removeSocialAccountRow(' + i + ')">✕</button></div></div>';
}
function renderSocialRows() {
  const w = $('#sa-rows');
  if (w) w.innerHTML = clientSocialDraft.length ? clientSocialDraft.map((a, i) => socialRowHTML(a, i)).join('') : '<p class="muted">No social accounts — add one below.</p>';
}
function syncSocialDraft() {
  document.querySelectorAll('#sa-rows .sa-row').forEach((row, i) => {
    const d = clientSocialDraft[i]; if (!d) return;
    d.platform = row.querySelector('.sa-platform').value;
    d.handle = row.querySelector('.sa-handle').value.trim();
    d.url = row.querySelector('.sa-url').value.trim();
    d.status = row.querySelector('.sa-status').value;
  });
}
function addSocialAccountRow() { syncSocialDraft(); clientSocialDraft.push({ id: uid(), platform: 'Instagram', handle: '', url: '', status: 'Manual entry', metrics: {} }); renderSocialRows(); }
function removeSocialAccountRow(i) { syncSocialDraft(); clientSocialDraft.splice(i, 1); renderSocialRows(); }
function openClientForm(id) {
  const c = id ? clientById(id) : null;
  clientSocialDraft = c ? (c.social || []).map(a => ({ id: a.id, platform: a.platform, handle: a.handle || '', url: a.url || '', status: a.status || 'Manual entry', metrics: a.metrics || {} })) : [];
  openModal('<h2>' + (c ? 'Edit client' : 'Add client') + '</h2><form onsubmit="saveClient(event,\'' + (id || '') + '\')">' +
    '<label>Client name</label><input id="c-name" required value="' + esc(c ? c.name : '') + '">' +
    '<div class="form-grid"><div><label>Service</label><input id="c-service" value="' + esc(c ? c.service : '') + '" placeholder="e.g. LinkedIn Growth"></div>' +
    '<div><label>Niche / business</label><input id="c-niche" value="' + esc(c ? c.niche : '') + '"></div></div>' +
    '<div class="form-grid"><div><label>Start date</label><input id="c-start" type="date" value="' + (c ? c.startDate : '') + '"></div>' +
    '<div><label>Project deadline</label><input id="c-deadline" type="date" value="' + (c ? c.deadline : '') + '"></div></div>' +
    '<div class="form-grid"><div><label>Amount / month (₹)</label><input id="c-amount" type="number" min="0" value="' + (c ? c.amount : '') + '"></div>' +
    '<div><label>Status</label><select id="c-status"><option' + (!c || c.status === 'Active' ? ' selected' : '') + '>Active</option><option' + (c && c.status === 'Paused' ? ' selected' : '') + '>Paused</option><option' + (c && c.status === 'Completed' ? ' selected' : '') + '>Completed</option></select></div></div>' +
    '<label>Notes</label><textarea id="c-notes" rows="2">' + esc(c ? c.notes || '' : '') + '</textarea>' +
    '<h3 style="margin-top:16px">Social accounts</h3>' +
    '<p class="muted">Add each profile the client owns. Links are manual entries — live sync needs the client’s platform authorization (Sec. 6), so status stays “Manual entry” until a real integration is connected.</p>' +
    '<div id="sa-rows">' + (clientSocialDraft.length ? clientSocialDraft.map((a, i) => socialRowHTML(a, i)).join('') : '<p class="muted">No social accounts — add one below.</p>') + '</div>' +
    '<div class="btnrow"><button class="btn ghost small" type="button" onclick="addSocialAccountRow()">+ Add account</button></div>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save client</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveClient(ev, id) {
  ev.preventDefault();
  const social = [];
  document.querySelectorAll('#sa-rows .sa-row').forEach(row => {
    const platform = row.querySelector('.sa-platform').value;
    const handle = row.querySelector('.sa-handle').value.trim();
    const url = row.querySelector('.sa-url').value.trim();
    const status = row.querySelector('.sa-status').value;
    if (!handle && !url) return;
    const old = id ? ((clientById(id).social) || []).find(a => a.id === row.dataset.id) : null;
    social.push({ id: row.dataset.id || uid(), platform, handle, url, status, metrics: old ? (old.metrics || {}) : {} });
  });
  const data = { name: $('#c-name').value.trim(), service: $('#c-service').value.trim(), niche: $('#c-niche').value.trim(), startDate: $('#c-start').value, deadline: $('#c-deadline').value, amount: $('#c-amount').value, status: $('#c-status').value, notes: $('#c-notes').value.trim(), social };
  if (id) { const c = clientById(id); if (c) { Object.assign(c, data); logActivity('Client updated: ' + c.name + '.'); } }
  else { state.clients.push(Object.assign({ id: uid(), demo: false, results: null }, data)); logActivity('New client added: ' + data.name + '.'); }
  save(); closeModal(); render();
}

function openConnectModal(id) {
  const c = state.connections.find(x => x.id === id); if (!c) return;
  openModal('<h2>' + esc(c.platform) + '</h2>' +
    '<p class="muted">Handle: <b>' + esc(c.handle) + '</b><br>Status: <b>' + esc(c.status) + '</b></p>' +
    '<p><a href="' + esc(c.url) + '" target="_blank" rel="noopener" style="color:var(--lime)">' + esc(c.url) + '</a></p>' +
    '<div class="note"><b>Synced from GitHub profile:</b> this is Raj’s real ' + esc(c.platform) + ' link. Live stats are not pulled by this static demo — open the profile to see live numbers.</div>' +
    '<div class="btnrow"><a class="btn" href="' + esc(c.url) + '" target="_blank" rel="noopener">Open profile ↗</a><button class="btn ghost" onclick="closeModal()">Close</button></div>');
}

function openAdsConnect() {
  openModal('<h2>Connect Meta Ads</h2>' +
    '<div class="note"><b>Real ad data needs Meta Business:</b><br>1. Open Meta Business Suite and confirm your ad account.<br>2. Connect it to this dashboard through Meta’s official login.<br>3. Spend, reach, leads and cost per lead will then load live — the demo numbers on this page are replaced, not mixed in.</div>' +
    '<p class="muted">Until then, this page shows clearly labeled demo campaigns so you can see how the tracking looks.</p>' +
    '<div class="btnrow"><button class="btn" onclick="closeModal()">I understand</button></div>');
}

function openLeaveForm() {
  const opts = state.employees.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
  openModal('<h2>New leave request</h2><form onsubmit="saveLeave(event)">' +
    '<label>Teammate</label><select id="l-emp">' + opts + '</select>' +
    '<div class="form-grid"><div><label>From</label><input id="l-from" type="date" required value="' + todayISO() + '"></div>' +
    '<div><label>To</label><input id="l-to" type="date" required value="' + addDays(1) + '"></div></div>' +
    '<label>Reason</label><input id="l-reason" required placeholder="e.g. Family function">' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Submit request</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveLeave(ev) {
  ev.preventDefault();
  const e = empById($('#l-emp').value);
  state.leaveRequests.unshift({ id: uid(), empId: $('#l-emp').value, from: $('#l-from').value, to: $('#l-to').value, reason: $('#l-reason').value.trim(), status: 'Pending' });
  logActivity('Leave request submitted for ' + (e ? e.name : 'teammate') + ' (' + $('#l-from').value + ' → ' + $('#l-to').value + ').');
  save(); closeModal(); render();
}

function openAnnouncementForm() {
  openModal('<h2>Post announcement</h2><form onsubmit="saveAnnouncement(event)">' +
    '<label>Message to the whole team</label><textarea id="a-text" rows="3" required placeholder="e.g. All client reports are due by Friday 6 PM."></textarea>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Post</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveAnnouncement(ev) {
  ev.preventDefault();
  const text = $('#a-text').value.trim(); if (!text) return;
  state.announcements.unshift({ id: uid(), text, at: new Date().toISOString(), by: state.settings.ceoName });
  logActivity('Announcement posted: “' + text.slice(0, 60) + (text.length > 60 ? '…' : '') + '”');
  save(); closeModal(); render();
}

/* ---------------- Sales & Proposals (Sec. 10) ---------------- */
const PROPOSAL_STATUSES = ['Draft', 'Sent', 'Negotiation', 'Accepted', 'Rejected'];
function viewProposals() {
  const sent = state.proposals.filter(p => ['Sent', 'Negotiation'].includes(p.status));
  const accepted = state.proposals.filter(p => p.status === 'Accepted');
  const accVal = accepted.reduce((s, p) => s + (Number(p.fee) || 0), 0);
  const rows = state.proposals.map(p => {
    const idx = PROPOSAL_STATUSES.indexOf(p.status);
    const exp = p.validUntil && p.validUntil < todayISO() && !['Accepted', 'Rejected'].includes(p.status);
    return '<tr><td><b>' + esc(p.title) + '</b><div class="muted">' + esc(p.leadName) + (p.clientId ? ' · ' + esc((clientById(p.clientId) || {}).name || '') : '') + '</div></td>' +
      '<td>' + esc(p.scope) + '</td><td>' + fmtINR(p.fee) + '</td>' +
      '<td>' + statusPill(p.status === 'Accepted' ? 'Done' : p.status === 'Rejected' ? 'Paused' : 'To Do').replace(/Done|Paused|To Do/g, m => p.status) + '</td>' +
      '<td>' + fmtDate(p.validUntil) + (exp ? ' <span class="overdue">EXPIRED</span>' : '') + '</td><td>v' + p.version + '</td>' +
      '<td><div class="btnrow">' +
      (idx < 3 ? '<button class="btn small" onclick="setProposalStatus(\'' + p.id + '\',\'' + PROPOSAL_STATUSES[idx + 1] + '\')">Advance →</button>' : '') +
      (p.status !== 'Accepted' && p.status !== 'Rejected' ? '<button class="btn small" onclick="setProposalStatus(\'' + p.id + '\',\'Accepted\')">Accept</button><button class="btn danger small" onclick="setProposalStatus(\'' + p.id + '\',\'Rejected\')">Reject</button>' : '') +
      '<button class="btn danger small" onclick="deleteProposal(\'' + p.id + '\')">Delete</button></div></td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Proposals</div><div class="value">' + state.proposals.length + '</div><div class="sub">' + sent.length + ' sent / in negotiation</div></div>' +
    '<div class="card kpi"><div class="label">Accepted value</div><div class="value lime">' + fmtINR(accVal) + '</div><div class="sub">' + accepted.length + ' accepted proposal(s)</div></div>' +
    '<div class="card kpi"><div class="label">Open proposal value</div><div class="value">' + fmtINR(sent.reduce((s, p) => s + (Number(p.fee) || 0), 0)) + '</div><div class="sub">sent + negotiation, not yet decided</div></div>' +
  '</div>' +
  '<div class="card"><h3>Proposals ' + demoTag() + '</h3><table><tr><th>Proposal</th><th>Scope</th><th>Fee</th><th>Status</th><th>Valid until</th><th>Ver.</th><th></th></tr>' + rows + '</table>' +
  '<p class="muted">A proposal carries scope, deliverables, fees, timeline and validity (Sec. 10). Accepting one starts onboarding — add the client on the Clients page and a project on the Projects page.</p></div>' +
  '<div class="card"><h3>New proposal</h3><form onsubmit="addProposal(event)">' +
  '<div class="form-grid"><div><label>Lead / business</label><input id="pr-lead" required placeholder="e.g. Sharma Jewellers"></div>' +
  '<div><label>Proposal title</label><input id="pr-title" required placeholder="e.g. Meta Ads — festive campaign"></div></div>' +
  '<label>Scope &amp; deliverables</label><input id="pr-scope" required placeholder="e.g. Ad account setup, 3 campaigns, creative, weekly optimisation">' +
  '<div class="form-grid"><div><label>Fee (₹)</label><input id="pr-fee" type="number" min="0" required></div>' +
  '<div><label>Valid until</label><input id="pr-valid" type="date" required value="' + addDays(14) + '"></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add proposal</button></div></form></div>';
}
function addProposal(ev) {
  ev.preventDefault();
  state.proposals.unshift({ id: uid(), leadName: $('#pr-lead').value.trim(), clientId: '', title: $('#pr-title').value.trim(), scope: $('#pr-scope').value.trim(), fee: Number($('#pr-fee').value) || 0, status: 'Draft', validUntil: $('#pr-valid').value, version: 1, createdAt: todayISO(), demo: false });
  logActivity('New proposal added: ' + $('#pr-title').value.trim() + ' (' + fmtINR($('#pr-fee').value) + ').');
  save(); render();
}
function setProposalStatus(id, status) {
  const p = state.proposals.find(x => x.id === id); if (!p) return;
  p.status = status;
  if (status !== 'Draft') p.version = (p.version || 1);
  logActivity('Proposal “' + p.title + '” moved to ' + status + '.');
  save(); render();
}
function deleteProposal(id) {
  const p = state.proposals.find(x => x.id === id); if (!p) return;
  if (!confirm('Delete proposal “' + p.title + '”?')) return;
  state.proposals = state.proposals.filter(x => x.id !== id);
  logActivity('Proposal deleted: “' + p.title + '”.');
  save(); render();
}

/* ---------------- Service Catalog (Sec. 5) ---------------- */
function viewCatalog() {
  const cards = state.services.map(s =>
    '<div class="card"><h3>' + esc(s.name) + ' ' + (s.demo ? '<span class="pill amber">DEMO</span>' : '') + '</h3>' +
    '<div style="margin:8px 0">' + statusPill(s.type === 'Retainer' ? 'Active' : 'To Do').replace(/Active|To Do/g, m => s.type) + ' <b style="font-size:18px">' + fmtINR(s.price) + '</b> <span class="muted">' + esc(s.unit) + '</span></div>' +
    '<p class="muted"><b style="color:var(--text)">Deliverables:</b> ' + esc(s.deliverables) + '</p>' +
    '<p class="muted"><b style="color:var(--text)">SLA:</b> ' + esc(s.sla) + '</p>' +
    '<div class="btnrow" style="margin-top:10px"><button class="btn danger small" onclick="deleteService(\'' + s.id + '\')">Delete</button></div></div>'
  ).join('');
  return '' +
  '<div class="grid2">' + cards + '</div>' +
  '<div class="card"><h3>Add a service / package</h3><form onsubmit="addService(event)">' +
  '<div class="form-grid"><div><label>Service name</label><input id="sv-name" required placeholder="e.g. LinkedIn Growth Retainer"></div>' +
  '<div><label>Type</label><select id="sv-type"><option>Retainer</option><option>Package</option><option>One-time</option></select></div></div>' +
  '<div class="form-grid"><div><label>Price (₹)</label><input id="sv-price" type="number" min="0" required></div>' +
  '<div><label>Unit</label><select id="sv-unit"><option>/mo</option><option>one-time</option></select></div></div>' +
  '<label>Deliverables</label><input id="sv-del" required placeholder="e.g. 12 posts/mo, 2 carousels, monthly report">' +
  '<label>SLA</label><input id="sv-sla" placeholder="e.g. Posts delivered by Friday each week">' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add service</button></div></form>' +
  '<p class="muted">Every service is sold as a configurable package or custom scope (Sec. 5). A signed scope generates the project, tasks and deliverables on the Projects page.</p></div>';
}
function addService(ev) {
  ev.preventDefault();
  state.services.push({ id: uid(), name: $('#sv-name').value.trim(), type: $('#sv-type').value, price: Number($('#sv-price').value) || 0, unit: $('#sv-unit').value, deliverables: $('#sv-del').value.trim(), sla: $('#sv-sla').value.trim(), demo: false });
  logActivity('Service added to catalog: ' + $('#sv-name').value.trim() + '.');
  save(); render();
}
function deleteService(id) {
  const s = state.services.find(x => x.id === id); if (!s) return;
  if (!confirm('Delete service “' + s.name + '”?')) return;
  state.services = state.services.filter(x => x.id !== id);
  save(); render();
}

/* ---------------- Projects (Sec. 5) ---------------- */
function viewProjects() {
  const onTrack = state.projects.filter(p => p.status === 'On track').length;
  const atRisk = state.projects.filter(p => p.status === 'At risk' || p.status === 'Delayed').length;
  const avgProg = state.projects.length ? Math.round(state.projects.reduce((s, p) => s + projectProgress(p).pct, 0) / state.projects.length) : 0;
  const rows = state.projects.map(p => {
    const c = clientById(p.clientId), o = empById(p.ownerId);
    const pr = projectProgress(p);
    const od = p.dueDate && p.dueDate < todayISO() && p.status !== 'Completed';
    return '<tr><td><b>' + esc(p.name) + '</b>' + (p.demo ? ' <span class="pill amber">DEMO</span>' : '') + '<div class="muted">' + esc(p.type) + ' · since ' + fmtDate(p.startDate) + '</div></td>' +
      '<td>' + esc(c ? c.name : '—') + '</td><td>' + esc(o ? o.name : 'Unassigned') + '</td>' +
      '<td>' + projectStatusPill(p.status) + '</td>' +
      '<td>' + fmtDate(p.dueDate) + (od ? ' <span class="overdue">OVERDUE</span>' : '') + '</td>' +
      '<td style="min-width:150px"><div class="progress"><i style="width:' + pr.pct + '%"></i></div><span class="muted">' + pr.done + '/' + pr.total + ' tasks · ' + pr.pct + '%</span></td>' +
      '<td><div class="btnrow"><button class="btn ghost small" onclick="openProjectForm(\'' + p.id + '\')">Edit</button><button class="btn danger small" onclick="deleteProject(\'' + p.id + '\')">Delete</button></div></td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Projects</div><div class="value">' + state.projects.length + '</div><div class="sub">' + onTrack + ' on track · ' + atRisk + ' at risk / delayed</div></div>' +
    '<div class="card kpi"><div class="label">Average progress</div><div class="value lime">' + avgProg + '%</div><div class="sub">from linked tasks done / total</div></div>' +
    '<div class="card kpi"><div class="label">Overdue projects</div><div class="value">' + state.projects.filter(p => p.dueDate && p.dueDate < todayISO() && p.status !== 'Completed').length + '</div><div class="sub">past due date and not completed</div></div>' +
  '</div>' +
  '<div class="toolbar"><span class="muted">Progress is computed from the project’s linked tasks — finish tasks and the bar moves.</span><span style="flex:1"></span><button class="btn" onclick="openProjectForm()">+ New project</button></div>' +
  '<div class="card"><table><tr><th>Project</th><th>Client</th><th>Owner</th><th>Status</th><th>Due date</th><th>Progress</th><th></th></tr>' + rows + '</table></div>';
}
function openProjectForm(id) {
  const p = id ? state.projects.find(x => x.id === id) : null;
  const cliOpts = state.clients.map(c => '<option value="' + c.id + '"' + (p && p.clientId === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>').join('');
  const ownOpts = state.employees.map(e => '<option value="' + e.id + '"' + (p && p.ownerId === e.id ? ' selected' : '') + '>' + esc(e.name) + '</option>').join('');
  openModal('<h2>' + (p ? 'Edit project' : 'New project') + '</h2><form onsubmit="saveProject(event,\'' + (id || '') + '\')">' +
    '<label>Project name</label><input id="pj-name" required value="' + esc(p ? p.name : '') + '" placeholder="e.g. LinkedIn Growth — Client">' +
    '<div class="form-grid"><div><label>Client</label><select id="pj-client">' + cliOpts + '</select></div>' +
    '<div><label>Owner</label><select id="pj-owner">' + ownOpts + '</select></div></div>' +
    '<div class="form-grid"><div><label>Type</label><select id="pj-type"><option' + (p && p.type === 'Retainer' ? ' selected' : '') + '>Retainer</option><option' + (p && p.type === 'Campaign' ? ' selected' : '') + '>Campaign</option><option' + (p && p.type === 'One-time' ? ' selected' : '') + '>One-time</option></select></div>' +
    '<div><label>Status</label><select id="pj-status"><option' + (!p || p.status === 'On track' ? ' selected' : '') + '>On track</option><option' + (p && p.status === 'At risk' ? ' selected' : '') + '>At risk</option><option' + (p && p.status === 'Delayed' ? ' selected' : '') + '>Delayed</option><option' + (p && p.status === 'On hold' ? ' selected' : '') + '>On hold</option><option' + (p && p.status === 'Completed' ? ' selected' : '') + '>Completed</option></select></div></div>' +
    '<div class="form-grid"><div><label>Start date</label><input id="pj-start" type="date" value="' + (p ? p.startDate : todayISO()) + '"></div>' +
    '<div><label>Due date</label><input id="pj-due" type="date" value="' + (p ? p.dueDate : addDays(30)) + '"></div></div>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save project</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveProject(ev, id) {
  ev.preventDefault();
  const data = { name: $('#pj-name').value.trim(), clientId: $('#pj-client').value, ownerId: $('#pj-owner').value, type: $('#pj-type').value, status: $('#pj-status').value, startDate: $('#pj-start').value, dueDate: $('#pj-due').value };
  if (id) { const p = state.projects.find(x => x.id === id); if (p) { Object.assign(p, data); logActivity('Project updated: ' + p.name + '.'); } }
  else { state.projects.push(Object.assign({ id: uid(), demo: false }, data)); logActivity('New project added: ' + data.name + '.'); }
  save(); closeModal(); render();
}
function deleteProject(id) {
  const p = state.projects.find(x => x.id === id); if (!p) return;
  if (!confirm('Delete project “' + p.name + '”? Its tasks will stay but become unlinked.')) return;
  state.tasks.forEach(t => { if (t.projectId === id) t.projectId = ''; });
  state.projects = state.projects.filter(x => x.id !== id);
  logActivity('Project deleted: ' + p.name + '.');
  save(); render();
}

/* ---------------- Social Calendar (Sec. 6) ---------------- */
function viewSocial() {
  const planned = state.posts.filter(p => ['Draft', 'Review'].includes(p.status)).length;
  const awaiting = state.posts.filter(p => p.status === 'Review').length;
  const scheduled = state.posts.filter(p => p.status === 'Scheduled').length;
  const published = state.posts.filter(p => p.status === 'Published').length;
  const kanban = POST_STATUSES.map(s => {
    const items = state.posts.filter(p => p.status === s).sort((a, b) => a.date.localeCompare(b.date));
    const cards = items.map(p => {
      const c = clientById(p.clientId);
      const idx = POST_STATUSES.indexOf(p.status);
      return '<div class="kcard"><b>' + esc(p.caption) + '</b><div class="muted">' + esc(c ? c.name : '—') + ' · ' + esc(p.platform) + ' · ' + esc(p.format) + '</div><div class="muted">' + fmtDate(p.date) + (p.reach ? ' · reach ' + p.reach.toLocaleString('en-IN') : '') + (p.demo ? ' · DEMO' : '') + '</div><div class="btnrow">' +
        (idx < 4 ? '<button class="btn small" onclick="setPostStatus(\'' + p.id + '\',\'' + POST_STATUSES[idx + 1] + '\')">' + (p.status === 'Approved' ? 'Schedule →' : p.status === 'Scheduled' ? 'Publish ✓' : 'Advance →') + '</button>' : '') +
        '<button class="btn danger small" onclick="deletePost(\'' + p.id + '\')">Delete</button></div></div>';
    }).join('') || '<p class="empty">—</p>';
    return '<div class="kcol"><h3>' + esc(s) + ' <span class="count">' + items.length + '</span></h3>' + cards + '</div>';
  }).join('');
  const cliOpts = state.clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Posts planned</div><div class="value">' + planned + '</div><div class="sub">draft + in review</div></div>' +
    '<div class="card kpi"><div class="label">Awaiting approval</div><div class="value">' + awaiting + '</div><div class="sub">in client / internal review</div></div>' +
    '<div class="card kpi"><div class="label">Scheduled</div><div class="value">' + scheduled + '</div><div class="sub">queued to publish</div></div>' +
    '<div class="card kpi"><div class="label">Published</div><div class="value lime">' + published + '</div><div class="sub">live posts in this calendar</div></div>' +
  '</div>' +
  '<div class="card"><h3>Post workflow — Sec. 6</h3><div class="flow" style="margin-top:10px">' + POST_STATUSES.map(s => '<span class="fstep">' + esc(s) + '</span>').join('<span class="farrow">→</span>') + '</div><p class="muted" style="margin-top:10px">Draft → Review → Approved → Scheduled → Published. Approval happens in the Client Portal too — a client approving a post moves it to Approved.</p></div>' +
  '<div class="kanban">' + kanban + '</div>' +
  '<div class="card"><h3>Plan a post</h3><form onsubmit="addPost(event)">' +
  '<div class="form-grid"><div><label>Client</label><select id="po-client">' + cliOpts + '</select></div>' +
  '<div><label>Platform</label><select id="po-platform"><option>LinkedIn</option><option>Instagram</option><option>Facebook</option><option>X</option></select></div></div>' +
  '<div class="form-grid"><div><label>Format</label><select id="po-format"><option>Text</option><option>Carousel</option><option>Reel</option><option>Static</option><option>Story</option><option>Video</option></select></div>' +
  '<div><label>Date</label><input id="po-date" type="date" required value="' + addDays(1) + '"></div></div>' +
  '<label>Caption / idea</label><input id="po-caption" required placeholder="e.g. Carousel — 5 LinkedIn mistakes founders make">' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add to calendar</button></div></form></div>';
}
function addPost(ev) {
  ev.preventDefault();
  state.posts.unshift({ id: uid(), clientId: $('#po-client').value, platform: $('#po-platform').value, format: $('#po-format').value, caption: $('#po-caption').value.trim(), date: $('#po-date').value, status: 'Draft', reach: null, demo: false });
  logActivity('Post planned: ' + $('#po-caption').value.trim().slice(0, 50) + '.');
  save(); render();
}
function setPostStatus(id, status) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  p.status = status;
  logActivity('Post “' + p.caption.slice(0, 40) + '” moved to ' + status + '.');
  save(); render();
}
function deletePost(id) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  if (!confirm('Delete post “' + p.caption.slice(0, 40) + '”?')) return;
  state.posts = state.posts.filter(x => x.id !== id);
  save(); render();
}

/* ---------------- Social Monitoring (Sec. 6 + Sec. 13) ---------------- */
function viewMonitoring() {
  const all = [];
  state.clients.forEach(c => (c.social || []).forEach(a => all.push({ c, a })));
  const withM = all.filter(x => socialMetrics(x.a, socialPeriod));
  const totFollowers = withM.reduce((s, x) => s + (socialMetrics(x.a, socialPeriod).followers || 0), 0);
  const totReach = withM.reduce((s, x) => s + (socialMetrics(x.a, socialPeriod).reach || 0), 0);
  const totImpr = withM.reduce((s, x) => s + (socialMetrics(x.a, socialPeriod).impressions || 0), 0);
  const totEng = withM.reduce((s, x) => s + (socialMetrics(x.a, socialPeriod).engagement || 0), 0);
  const avgER = totReach ? (totEng / totReach * 100) : 0;
  const noLink = state.clients.filter(c => !(c.social || []).length);
  const sorted = all.slice().sort((x, y) => {
    const mx = socialMetrics(x.a, socialPeriod), my = socialMetrics(y.a, socialPeriod);
    return ((my && my.followers) || 0) - ((mx && mx.followers) || 0);
  });
  const rows = sorted.map(x => {
    const m = socialMetrics(x.a, socialPeriod);
    const er = m ? engRate(m) : 0;
    return '<tr class="clickable" onclick="setView(\'clients\',\'' + x.c.id + '\')"><td><b>' + esc(x.c.name) + '</b>' + (x.c.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td>' +
      '<td>' + esc(x.a.platform) + '</td>' +
      '<td>' + (x.a.url ? '<a href="' + esc(x.a.url) + '" target="_blank" rel="noopener" style="color:var(--lime)" onclick="event.stopPropagation()">' + esc(x.a.handle || x.a.url) + '</a>' : esc(x.a.handle || '—')) + '</td>' +
      '<td>' + (m ? (m.followers || 0).toLocaleString('en-IN') : '—') + '</td>' +
      '<td>' + (m ? trendHTML(m.followers, m.prevFollowers) : '—') + '</td>' +
      '<td>' + (m ? (m.reach || 0).toLocaleString('en-IN') : '—') + '</td>' +
      '<td>' + (m ? (m.impressions || 0).toLocaleString('en-IN') : '—') + '</td>' +
      '<td>' + (m ? (m.engagement || 0).toLocaleString('en-IN') : '—') + '</td>' +
      '<td>' + (m ? er.toFixed(1) + '%' : '—') + '</td>' +
      '<td>' + (m ? fmtDT(m.updatedAt) : '<span class="muted">No metrics yet</span>') + '</td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Accounts tracked</div><div class="value">' + all.length + '</div><div class="sub">across ' + state.clients.length + ' clients</div></div>' +
    '<div class="card kpi"><div class="label">Total followers</div><div class="value">' + totFollowers.toLocaleString('en-IN') + '</div><div class="sub">sum of entered metrics · ' + (socialPeriod === '7d' ? 'last 7 days' : 'last 30 days') + '</div></div>' +
    '<div class="card kpi"><div class="label">Total reach</div><div class="value">' + totReach.toLocaleString('en-IN') + '</div><div class="sub">' + totImpr.toLocaleString('en-IN') + ' impressions</div></div>' +
    '<div class="card kpi"><div class="label">Avg engagement rate</div><div class="value">' + avgER.toFixed(1) + '%</div><div class="sub">' + totEng.toLocaleString('en-IN') + ' engagements</div></div>' +
  '</div>' +
  '<div class="card"><h3>Live monitoring — all client accounts <span class="pill amber">MANUAL ENTRY</span></h3>' +
  '<div class="toolbar"><span class="muted">Period:</span><select onchange="setSocialPeriod(this.value)" style="width:auto"><option value="30d"' + (socialPeriod === '30d' ? ' selected' : '') + '>Last 30 days</option><option value="7d"' + (socialPeriod === '7d' ? ' selected' : '') + '>Last 7 days</option></select>' +
  '<span class="muted">Click a row to open that client; click a handle to open the profile. Numbers are entered by hand — live platform sync needs each client’s official authorization (Sec. 6).</span></div>' +
  (all.length ? '<div style="overflow-x:auto"><table><tr><th>Client</th><th>Platform</th><th>Handle</th><th>Followers</th><th>Growth</th><th>Reach</th><th>Impressions</th><th>Engagement</th><th>ER</th><th>Last updated</th></tr>' + rows + '</table></div>'
    : '<p class="empty">No social accounts added yet. Add them from a client’s detail page — “Manage accounts”.</p>') + '</div>' +
  (noLink.length ? '<div class="note"><b>No social links yet:</b> ' + noLink.map(c => esc(c.name)).join(', ') + ' — open the client and use “Add link” to start monitoring them.</div>' : '') +
  '<div class="note"><b>Honest note (Sec. 6):</b> this is manual-entry monitoring. Real live numbers appear only after each client authorises their platform account (OAuth) — no passwords are collected here, and nothing is shown as “Connected” until a real integration is wired up.</div>';
}

/* ---------------- Content Studio (Sec. 7) ---------------- */
function viewContent() {
  const inReview = state.briefs.filter(b => b.status === 'Review' || b.status === 'Revisions').length;
  const rows = state.briefs.map(b => {
    const c = clientById(b.clientId), o = empById(b.ownerId);
    const idx = BRIEF_STATUSES.indexOf(b.status);
    return '<tr><td><b>' + esc(b.title) + '</b>' + (b.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' + esc(b.type) + '</td><td>' + esc(o ? o.name : '—') + '</td>' +
      '<td>' + statusPill(b.status === 'Approved' || b.status === 'Delivered' ? 'Done' : b.status === 'Revisions' ? 'Paused' : 'To Do').replace(/Done|Paused|To Do/g, m => b.status) + '</td>' +
      '<td>' + b.revisions + ' round(s)</td><td>' + fmtDate(b.due) + '</td>' +
      '<td><div class="btnrow">' + (idx < 5 ? '<button class="btn small" onclick="setBriefStatus(\'' + b.id + '\',\'' + BRIEF_STATUSES[idx + 1] + '\')">Advance →</button>' : '') +
      '<button class="btn ghost small" onclick="addRevision(\'' + b.id + '\')">+ Revision</button></div></td></tr>';
  }).join('');
  const cliOpts = state.clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  const ownOpts = state.employees.map(e => '<option value="' + e.id + '">' + esc(e.name) + '</option>').join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Briefs</div><div class="value">' + state.briefs.length + '</div><div class="sub">' + inReview + ' in review / revisions</div></div>' +
    '<div class="card kpi"><div class="label">Approved / delivered</div><div class="value lime">' + state.briefs.filter(b => ['Approved', 'Delivered'].includes(b.status)).length + '</div><div class="sub">ready or shipped work</div></div>' +
    '<div class="card kpi"><div class="label">Revision rounds</div><div class="value">' + state.briefs.reduce((s, b) => s + (b.revisions || 0), 0) + '</div><div class="sub">across all briefs</div></div>' +
  '</div>' +
  '<div class="card"><h3>Creative briefs ' + demoTag() + '</h3><table><tr><th>Brief</th><th>Client</th><th>Type</th><th>Owner</th><th>Status</th><th>Revisions</th><th>Due</th><th></th></tr>' + rows + '</table>' +
  '<p class="muted">Workflow: Brief → Draft → Review → Revisions → Approved → Delivered (Sec. 7). Each revision round is counted — scope changes beyond the agreed rounds go through a change request.</p></div>' +
  '<div class="card"><h3>New brief</h3><form onsubmit="addBrief(event)">' +
  '<label>Brief title</label><input id="br-title" required placeholder="e.g. Carousel — client results">' +
  '<div class="form-grid"><div><label>Client</label><select id="br-client">' + cliOpts + '</select></div>' +
  '<div><label>Type</label><select id="br-type"><option>Copy</option><option>Design</option><option>Video</option></select></div></div>' +
  '<div class="form-grid"><div><label>Owner</label><select id="br-owner">' + ownOpts + '</select></div>' +
  '<div><label>Due date</label><input id="br-due" type="date" required value="' + addDays(3) + '"></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add brief</button></div></form></div>';
}
function addBrief(ev) {
  ev.preventDefault();
  state.briefs.unshift({ id: uid(), clientId: $('#br-client').value, title: $('#br-title').value.trim(), type: $('#br-type').value, ownerId: $('#br-owner').value, status: 'Brief', revisions: 0, due: $('#br-due').value, demo: false });
  logActivity('Brief added: ' + $('#br-title').value.trim() + '.');
  save(); render();
}
function setBriefStatus(id, status) {
  const b = state.briefs.find(x => x.id === id); if (!b) return;
  b.status = status;
  logActivity('Brief “' + b.title + '” moved to ' + status + '.');
  save(); render();
}
function addRevision(id) {
  const b = state.briefs.find(x => x.id === id); if (!b) return;
  b.revisions = (b.revisions || 0) + 1;
  b.status = 'Revisions';
  logActivity('Revision round ' + b.revisions + ' requested on brief “' + b.title + '”.');
  save(); render();
}

/* ---------------- SEO (Sec. 8) ---------------- */
function viewSEO() {
  const tracked = state.keywords.filter(k => k.status === 'Tracking');
  const pos = state.keywords.filter(k => k.position).map(k => k.position);
  const avgPos = pos.length ? (pos.reduce((s, p) => s + p, 0) / pos.length).toFixed(1) : '—';
  const openIssues = state.seoIssues.filter(i => i.status !== 'Fixed');
  const kwRows = state.keywords.map(k => {
    const c = clientById(k.clientId);
    return '<tr><td><b>' + esc(k.keyword) + '</b>' + (k.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + esc(c ? c.name : 'Agency website') + '</td><td>' + esc(k.intent) + '</td><td>' + esc(k.targetPage) + '</td><td>' + priorityPill(k.priority) + '</td><td>' + esc(k.status) + '</td><td>' + (k.position ? '#' + k.position : '—') + '</td></tr>';
  }).join('');
  const isRows = state.seoIssues.map(i => {
    const c = clientById(i.clientId);
    const next = i.status === 'Open' ? 'In progress' : i.status === 'In progress' ? 'Fixed' : null;
    return '<tr><td>' + esc(i.issue) + (i.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + esc(c ? c.name : 'Agency website') + '</td><td>' + statusPill(i.severity === 'High' ? 'Paused' : 'To Do').replace(/Paused|To Do/g, m => i.severity) + '</td><td>' + esc(i.status) + '</td><td>' + (next ? '<button class="btn small" onclick="setSeoIssueStatus(\'' + i.id + '\',\'' + next + '\')">Mark ' + next + '</button>' : '') + '</td></tr>';
  }).join('');
  const cliOpts = '<option value="">Agency website</option>' + state.clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Keywords tracked</div><div class="value">' + tracked.length + '</div><div class="sub">' + state.keywords.length + ' keywords in the map</div></div>' +
    '<div class="card kpi"><div class="label">Average position ' + demoTag() + '</div><div class="value">' + avgPos + '</div><div class="sub">across keywords with a recorded position</div></div>' +
    '<div class="card kpi"><div class="label">Technical issues open</div><div class="value">' + openIssues.length + '</div><div class="sub">' + openIssues.filter(i => i.severity === 'High').length + ' high severity</div></div>' +
    '<div class="card kpi"><div class="label">Content shipped</div><div class="value">' + state.posts.filter(p => p.status === 'Published').length + '</div><div class="sub">published posts (content plan)</div></div>' +
  '</div>' +
  '<div class="card"><h3>Keyword map ' + demoTag() + '</h3><table><tr><th>Keyword</th><th>Client / site</th><th>Intent</th><th>Target page</th><th>Priority</th><th>Status</th><th>Position</th></tr>' + kwRows + '</table>' +
  '<p class="muted">Positions are demo samples. Connect Search Console (or add manual rank checks) for real positions — never present a demo position to a client as a real ranking.</p></div>' +
  '<div class="card"><h3>Technical issues ' + demoTag() + '</h3><table><tr><th>Issue</th><th>Site</th><th>Severity</th><th>Status</th><th></th></tr>' + isRows + '</table></div>' +
  '<div class="grid2"><div class="card"><h3>Add a keyword</h3><form onsubmit="addKeyword(event)">' +
  '<label>Keyword</label><input id="kw-word" required placeholder="e.g. linkedin growth agency">' +
  '<div class="form-grid"><div><label>Client / site</label><select id="kw-client">' + cliOpts + '</select></div>' +
  '<div><label>Intent</label><select id="kw-intent"><option>Informational</option><option>Commercial</option><option>Local</option></select></div></div>' +
  '<div class="form-grid"><div><label>Target page</label><input id="kw-page" required value="/" placeholder="/services"></div>' +
  '<div><label>Priority</label><select id="kw-pri"><option>High</option><option>Medium</option><option>Low</option></select></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add keyword</button></div></form></div>' +
  '<div class="card"><h3>Log a technical issue</h3><form onsubmit="addSeoIssue(event)">' +
  '<label>Issue</label><input id="si-issue" required placeholder="e.g. Missing meta descriptions on 3 pages">' +
  '<div class="form-grid"><div><label>Client / site</label><select id="si-client">' + cliOpts + '</select></div>' +
  '<div><label>Severity</label><select id="si-sev"><option>High</option><option>Medium</option><option>Low</option></select></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Log issue</button></div></form></div></div>';
}
function addKeyword(ev) {
  ev.preventDefault();
  state.keywords.push({ id: uid(), clientId: $('#kw-client').value, keyword: $('#kw-word').value.trim(), intent: $('#kw-intent').value, targetPage: $('#kw-page').value.trim(), priority: $('#kw-pri').value, status: 'Tracking', position: null, demo: false });
  logActivity('Keyword added: ' + $('#kw-word').value.trim() + '.');
  save(); render();
}
function addSeoIssue(ev) {
  ev.preventDefault();
  state.seoIssues.unshift({ id: uid(), clientId: $('#si-client').value, issue: $('#si-issue').value.trim(), severity: $('#si-sev').value, status: 'Open', demo: false });
  logActivity('SEO issue logged: ' + $('#si-issue').value.trim() + '.');
  save(); render();
}
function setSeoIssueStatus(id, status) {
  const i = state.seoIssues.find(x => x.id === id); if (!i) return;
  i.status = status;
  logActivity('SEO issue marked ' + status + ': ' + i.issue + '.');
  save(); render();
}

/* ---------------- HR (Sec. 12) ---------------- */
function viewHR() {
  const cap = (state.settings && state.settings.capacity) || 5;
  const totalOpen = state.tasks.filter(t => t.status !== 'done').length;
  const avgUtil = state.employees.length ? Math.round(totalOpen / (state.employees.length * cap) * 100) : 0;
  const pendingLeave = state.leaveRequests.filter(r => r.status === 'Pending');
  const rows = state.employees.map(e => {
    const open = openTasksOf(e.id).length;
    const util = Math.min(100, Math.round(open / cap * 100));
    const wl = workload(e.id);
    return '<tr class="clickable" onclick="setView(\'team\',\'' + e.id + '\')"><td><b>' + esc(e.name) + '</b>' + (e.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + esc(e.role) + '</td><td>' + esc(e.team || 'General') + ' · ' + esc(e.teamId || 'No ID') + '</td><td>' + statusPill(e.status) + '</td><td>' + open + ' open</td><td>' + util + '%</td><td><span class="pill ' + wl.cls + '">' + wl.label + '</span></td></tr>';
  }).join('');
  const leaveRows = pendingLeave.map(r => {
    const e = empById(r.empId);
    return '<li><b>' + esc(e ? e.name : '—') + '</b> — ' + fmtDate(r.from) + ' → ' + fmtDate(r.to) + ' · ' + esc(r.reason) + ' <button class="btn small" onclick="setView(\'attendance\')">Review</button></li>';
  }).join('') || '<li class="muted">No leave requests waiting.</li>';
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Headcount</div><div class="value">' + state.employees.length + '</div><div class="sub">' + state.employees.filter(e => e.status === 'Working').length + ' working today</div></div>' +
    '<div class="card kpi"><div class="label">Availability</div><div class="value">' + state.employees.filter(e => e.status === 'Working').length + ' / ' + state.employees.length + '</div><div class="sub">' + state.employees.filter(e => e.status === 'On leave').length + ' on leave</div></div>' +
    '<div class="card kpi"><div class="label">Average utilization</div><div class="value">' + avgUtil + '%</div><div class="sub">open tasks vs capacity of ' + cap + ' per person</div></div>' +
    '<div class="card kpi"><div class="label">Leave requests</div><div class="value">' + pendingLeave.length + ' pending</div><div class="sub">' + state.leaveRequests.length + ' total requests</div></div>' +
  '</div>' +
  '<div class="card"><h3>Employee directory — click a row for detail</h3><table><tr><th>Employee</th><th>Role</th><th>Team / ID</th><th>Status</th><th>Tasks</th><th>Utilization</th><th>Workload</th></tr>' + rows + '</table></div>' +
  '<div class="grid2"><div class="card"><h3>Leave awaiting decision</h3><ul class="feed">' + leaveRows + '</ul></div>' +
  '<div class="card"><h3>HR shortcuts</h3><div class="btnrow" style="margin-top:10px"><button class="btn ghost" onclick="setView(\'team\')">Team directory</button><button class="btn ghost" onclick="setView(\'attendance\')">Attendance &amp; leave</button><button class="btn ghost" onclick="setView(\'performance\')">Performance</button><button class="btn ghost" onclick="setView(\'workload\')">Capacity &amp; workload</button></div><p class="muted" style="margin-top:10px">Onboarding, policies, equipment and recruitment checklists live in the SOP library (Sec. 12) — add them from Settings when the team grows.</p></div></div>';
}

/* ---------------- Client Portal (Sec. 14) ---------------- */
let portalClientId = null;
function socialGridHTML() {
  return '<div class="social-grid">' + state.connections.map(c =>
    '<a class="social-card" href="' + esc(c.url) + '" target="_blank" rel="noopener"><div class="s-ic">' + esc(c.platform[0]) + '</div><div><b>' + esc(c.platform) + '</b><span>' + esc(c.handle) + '</span></div></a>'
  ).join('') + '</div><p class="muted" style="margin-top:8px">Synced from GitHub profile · each link opens in a new tab.</p>';
}
function viewPortal() {
  if (!portalClientId || !clientById(portalClientId)) portalClientId = state.clients[0] ? state.clients[0].id : null;
  const c = clientById(portalClientId);
  if (!c) return '<p class="muted">No clients yet.</p>';
  const chips = state.clients.map(x => '<button class="btn ' + (x.id === c.id ? '' : 'ghost') + ' small" onclick="portalClientId=\'' + x.id + '\';render()">' + esc(x.name) + '</button>').join(' ');
  const ct = state.tasks.filter(t => t.clientId === c.id);
  const doneT = ct.filter(t => t.status === 'done'), openT = ct.filter(t => t.status !== 'done');
  const miles = '<li><b>Work done:</b> ' + doneT.length + ' task(s) completed' + (doneT.length ? ' — ' + doneT.slice(0, 3).map(t => esc(t.title)).join('; ') : '') + '</li>' +
    '<li><b>Coming up:</b> ' + (openT.length ? openT.slice(0, 5).map(t => esc(t.title) + ' (due ' + fmtDate(t.deadline) + ')').join('; ') : 'nothing scheduled') + '</li>';
  const cPosts = state.posts.filter(p => p.clientId === c.id);
  const apprRows = cPosts.filter(p => ['Review', 'Approved', 'Scheduled'].includes(p.status)).map(p =>
    '<tr><td><b>' + esc(p.caption) + '</b><div class="muted">' + esc(p.platform) + ' · ' + esc(p.format) + ' · ' + fmtDate(p.date) + '</div></td><td>' + esc(p.status) + '</td>' +
    '<td><div class="btnrow">' + (p.status === 'Review' ? '<button class="btn small" onclick="portalApprovePost(\'' + p.id + '\')">Approve ✓</button><button class="btn ghost small" onclick="portalRequestRevision(\'' + p.id + '\')">Request revision</button>' : '<span class="muted">No action needed</span>') + '</div></td></tr>'
  ).join('') || '<tr><td colspan="3" class="muted">No posts waiting for approval.</td></tr>';
  const cBriefs = state.briefs.filter(b => b.clientId === c.id && ['Review', 'Revisions'].includes(b.status));
  const briefRows = cBriefs.map(b =>
    '<tr><td><b>' + esc(b.title) + '</b><div class="muted">' + esc(b.type) + ' · ' + b.revisions + ' revision round(s)</div></td><td>' + esc(b.status) + '</td>' +
    '<td><button class="btn small" onclick="portalApproveBrief(\'' + b.id + '\')">Approve ✓</button></td></tr>'
  ).join('') || '<tr><td colspan="3" class="muted">No briefs waiting for approval.</td></tr>';
  const invRows = state.finance.invoices.filter(i => i.clientId === c.id).map(i =>
    '<tr><td>' + esc(i.label) + '</td><td>' + fmtINR(i.amount) + '</td><td>' + fmtDate(i.due) + '</td><td>' + esc(i.status) + '</td></tr>'
  ).join('') || '<tr><td colspan="4" class="muted">No invoices for this client yet.</td></tr>';
  return '' +
  '<div class="portal-hero"><h2>Client Portal — ' + esc(c.name) + ' ' + (c.demo ? '<span class="pill amber">DEMO</span>' : '') + '</h2>' +
  '<p class="muted">This is exactly what the client sees: their services, milestones, approvals and invoices — nothing else. Internal notes, agency margins, other clients and credentials are never shown here (Sec. 14).</p>' +
  '<div class="btnrow" style="margin-top:12px">' + chips + '</div></div>' +
  '<div class="grid2"><div class="card"><h3>Active services</h3><div class="stat-grid">' +
    '<div class="stat"><div class="slabel">Service</div><div class="svalue" style="font-size:16px">' + esc(c.service) + '</div></div>' +
    '<div class="stat"><div class="slabel">Retainer</div><div class="svalue" style="font-size:16px">' + (c.amount ? fmtINR(c.amount) + '/mo' : 'Not set') + '</div></div>' +
    '<div class="stat"><div class="slabel">Status</div><div class="svalue" style="font-size:16px">' + esc(c.status) + '</div></div>' +
    '<div class="stat"><div class="slabel">Project deadline</div><div class="svalue" style="font-size:16px">' + fmtDate(c.deadline) + '</div></div></div>' +
    '<p class="muted">' + esc(c.niche) + (c.results ? ' · LinkedIn: ' + c.results.followers.toLocaleString('en-IN') + ' followers, ' + c.results.impressions.toLocaleString('en-IN') + ' impressions (verified analytics).' : '') + '</p></div>' +
  '<div class="card"><h3>Milestones</h3><ul class="feed">' + miles + '</ul><p class="muted">' + doneT.length + ' of ' + ct.length + ' tasks complete.</p></div></div>' +
  '<div class="card"><h3>Content awaiting your approval</h3><table><tr><th>Post</th><th>Status</th><th></th></tr>' + apprRows + '</table></div>' +
  '<div class="card"><h3>Briefs awaiting your approval</h3><table><tr><th>Brief</th><th>Status</th><th></th></tr>' + briefRows + '</table></div>' +
  '<div class="card"><h3>Invoices</h3><table><tr><th>Invoice</th><th>Amount</th><th>Due</th><th>Status</th></tr>' + invRows + '</table></div>' +
  '<div class="card"><h3>Find Raj online</h3>' + socialGridHTML() + '</div>';
}
function portalApprovePost(id) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  p.status = 'Approved';
  logActivity('Client approved post: “' + p.caption.slice(0, 40) + '”.');
  save(); render();
}
function portalRequestRevision(id) {
  const p = state.posts.find(x => x.id === id); if (!p) return;
  p.status = 'Draft';
  logActivity('Client requested revision on post: “' + p.caption.slice(0, 40) + '”.');
  save(); render();
}
function portalApproveBrief(id) {
  const b = state.briefs.find(x => x.id === id); if (!b) return;
  b.status = 'Approved';
  logActivity('Client approved brief: “' + b.title + '”.');
  save(); render();
}

/* ---------------- Paid Ads — campaign actions (Sec. 9) ---------------- */
function addCampaign(ev) {
  ev.preventDefault();
  state.campaigns.unshift({ id: uid(), name: $('#cp-name').value.trim(), platform: $('#cp-platform').value, budget: Number($('#cp-budget').value) || 0, spend: Number($('#cp-spend').value) || 0, reach: Number($('#cp-reach').value) || 0, leads: Number($('#cp-leads').value) || 0, conversions: Number($('#cp-conv').value) || 0, status: $('#cp-status').value, demo: false });
  logActivity('Campaign added: ' + $('#cp-name').value.trim() + '.');
  save(); render();
}
function deleteCampaign(id) {
  const c = state.campaigns.find(x => x.id === id); if (!c) return;
  if (!confirm('Delete campaign “' + c.name + '”?')) return;
  state.campaigns = state.campaigns.filter(x => x.id !== id);
  save(); render();
}

/* ---------------- Login gate (demo-grade auth) ----------------
   The credentials live ONLY in this browser's localStorage. This is a
   static site with no backend, so this is NOT real server security —
   the screens say so plainly. Session survives refresh via
   sessionStorage; logout clears it. */
function getCreds() {
  try { return JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); } catch (e) { return null; }
}
function isAuthed() {
  try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
}
function showAuth() {
  $('#app').style.display = 'none';
  const root = $('#auth-root');
  const creds = getCreds();
  root.innerHTML = creds ? authLoginHTML() : authCreateHTML();
}
function enterApp() {
  $('#auth-root').innerHTML = '';
  $('#app').style.display = '';
  currentView = 'overview'; viewParam = null;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === 'overview'));
  $('#viewTitle').textContent = TITLES.overview;
  render();
}
function authShell(inner) {
  return '<div class="auth-wrap"><div class="auth-card">' +
    '<div class="logo">Agency<span>OS</span></div>' +
    '<div class="auth-tag">Digital Marketing Agency ERP &amp; CEO Command Center</div>' + inner + '</div></div>';
}
function authCreateHTML() {
  return authShell(
    '<h2>Create your login</h2><p class="auth-sub">Set a username and password for this dashboard. First run only — after this, you will log in with them.</p>' +
    '<div class="auth-err" id="au-err"></div>' +
    '<form onsubmit="createLogin(event)">' +
    '<label>Username</label><input id="au-user" required minlength="3" placeholder="e.g. rajan" autocomplete="username">' +
    '<label>Password</label><input id="au-pass" type="password" required minlength="4" placeholder="At least 4 characters" autocomplete="new-password">' +
    '<label>Confirm password</label><input id="au-pass2" type="password" required minlength="4" placeholder="Repeat your password" autocomplete="new-password">' +
    '<div class="btnrow" style="margin-top:16px"><button class="btn" type="submit" style="flex:1">Create login &amp; enter</button></div></form>' +
    '<div class="auth-demo"><button class="btn ghost" type="button" onclick="demoLogin()">Use demo login — preview instantly</button></div>' +
    '<p class="auth-note"><b>Demo login</b> — stored only in this browser. This static site has no server, so this is not real account security. Anyone with access to this browser can open the dashboard.</p>');
}
function authLoginHTML() {
  return authShell(
    '<h2>Welcome back</h2><p class="auth-sub">Log in to open your CEO dashboard.</p>' +
    '<div class="auth-err" id="au-err"></div>' +
    '<form onsubmit="doLogin(event)">' +
    '<label>Username</label><input id="au-user" required placeholder="Your username" autocomplete="username">' +
    '<label>Password</label><input id="au-pass" type="password" required placeholder="Your password" autocomplete="current-password">' +
    '<div class="btnrow" style="margin-top:16px"><button class="btn" type="submit" style="flex:1">Login</button></div></form>' +
    '<div class="auth-demo"><button class="btn ghost" type="button" onclick="demoLogin()">Use demo login (demo / demo)</button></div>' +
    '<div class="auth-links"><a onclick="resetLogin()">Reset login — forgot password?</a><span class="muted">Stored only in this browser</span></div>' +
    '<p class="auth-note"><b>Demo login</b> — stored only in this browser. This static site has no server, so this is not real account security.</p>');
}
function authError(msg) {
  const el = $('#au-err');
  if (el) { el.textContent = msg; el.classList.add('show'); }
}
function createLogin(ev) {
  ev.preventDefault();
  const u = $('#au-user').value.trim(), p = $('#au-pass').value, p2 = $('#au-pass2').value;
  if (u.length < 3) { authError('Username needs at least 3 characters.'); return; }
  if (p.length < 4) { authError('Password needs at least 4 characters.'); return; }
  if (p !== p2) { authError('Passwords do not match — please type the same password twice.'); return; }
  localStorage.setItem(AUTH_KEY, JSON.stringify({ u, p }));
  sessionStorage.setItem(SESSION_KEY, '1');
  logActivity('Login created for this browser.');
  save();
  enterApp();
}
function doLogin(ev) {
  ev.preventDefault();
  const creds = getCreds();
  const u = $('#au-user').value.trim(), p = $('#au-pass').value;
  if (creds && u === creds.u && p === creds.p) {
    sessionStorage.setItem(SESSION_KEY, '1');
    enterApp();
  } else {
    authError('Wrong username or password. Try again, use the demo login, or reset the login.');
  }
}
function demoLogin() {
  sessionStorage.setItem(SESSION_KEY, '1');
  sessionStorage.setItem('agencyos-demo-user', '1');
  enterApp();
}
function logout() {
  try { sessionStorage.removeItem(SESSION_KEY); sessionStorage.removeItem('agencyos-demo-user'); } catch (e) {}
  showAuth();
}
function resetLogin() {
  if (!confirm('Clear the saved login? You will need to create a new one on your next visit.')) return;
  try { localStorage.removeItem(AUTH_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  showAuth();
}

/* ---------------- Init ---------------- */
function init() {
  load();
  $('#topDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  if (isAuthed()) { enterApp(); } else { showAuth(); }
}
init();

/* ---------------- Alerts center ---------------- */
function alertsList() {
  const list = [];
  state.tasks.filter(isOverdue).forEach(t => {
    const e = empById(t.assigneeId);
    list.push({ sev: 'red', type: 'Overdue task', text: t.title + ' — ' + (e ? e.name : 'Unassigned') + ', due ' + fmtDate(t.deadline), view: 'tasks' });
  });
  state.clients.filter(c => c.status === 'Active' && c.deadline && c.deadline < todayISO()).forEach(c =>
    list.push({ sev: 'red', type: 'Missed deadline', text: c.name + ' — project deadline was ' + fmtDate(c.deadline), view: 'clients' }));
  state.leaveRequests.filter(r => r.status === 'Pending').forEach(r => {
    const e = empById(r.empId);
    list.push({ sev: 'amber', type: 'Leave approval', text: (e ? e.name : 'Teammate') + ' — leave ' + fmtDate(r.from) + ' to ' + fmtDate(r.to) + ' needs your decision', view: 'attendance' });
  });
  state.finance.invoices.filter(i => i.status !== 'Paid').forEach(i =>
    list.push({ sev: i.status === 'Overdue' ? 'red' : 'amber', type: 'Unpaid invoice', text: i.label + ' — ' + fmtINR(i.amount) + ', due ' + fmtDate(i.due), view: 'finance' }));
  state.clients.filter(c => state.tasks.some(t => t.clientId === c.id && isOverdue(t))).forEach(c =>
    list.push({ sev: 'amber', type: 'At-risk client', text: c.name + ' has overdue tasks — check in this week', view: 'clients' }));
  state.proposals.filter(p => ['Sent', 'Negotiation'].includes(p.status) && p.validUntil && p.validUntil <= addDays(7)).forEach(p =>
    list.push({ sev: 'amber', type: 'Proposal expiring', text: p.title + ' — ' + p.leadName + ', valid until ' + fmtDate(p.validUntil), view: 'proposals' }));
  state.clients.filter(c => c.status === 'Active' && c.deadline && c.deadline >= todayISO() && c.deadline <= addDays(14)).forEach(c =>
    list.push({ sev: 'amber', type: 'Renewal due', text: c.name + ' — contract / project ends ' + fmtDate(c.deadline) + ', review renewal', view: 'clients' }));
  list.sort((a, b) => (a.sev === 'red' ? 0 : 1) - (b.sev === 'red' ? 0 : 1));
  return list;
}
function alertCount() { return alertsList().length; }
function viewAlerts() {
  const list = alertsList();
  const rows = list.map(a =>
    '<div class="deadline-row"><div><span class="pill ' + a.sev + '">' + a.type + '</span></div>' +
    '<div class="grow"><b>' + esc(a.text) + '</b></div>' +
    '<button class="btn ghost small" onclick="setView(\'' + a.view + '\')">Open</button></div>'
  ).join('');
  return '' +
  '<div class="card"><h3>' + (list.length ? list.length + ' item' + (list.length > 1 ? 's' : '') + ' need' + (list.length > 1 ? '' : 's') + ' your attention' : 'All clear') + '</h3>' +
  (rows || '<p class="empty">Nothing needs your attention right now. Overdue tasks, missed deadlines, pending leave approvals, unpaid invoices and at-risk clients will appear here automatically.</p>') + '</div>';
}

/* ---------------- Finance ---------------- */
function financeRevenue() { return state.clients.reduce((s, c) => s + (Number(c.amount) || 0), 0); }
function financeExpenses() { return state.finance.expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0); }
function pendingPayments() { return state.finance.invoices.filter(i => i.status !== 'Paid').reduce((s, i) => s + (Number(i.amount) || 0), 0); }
function viewFinance() {
  const rev = financeRevenue(), exp = financeExpenses(), profit = rev - exp;
  const expRows = state.finance.expenses.map(e =>
    '<tr><td>' + esc(e.label) + '</td><td>' + fmtINR(e.amount) + '</td><td><button class="btn danger small" onclick="deleteExpense(\'' + e.id + '\')">Delete</button></td></tr>'
  ).join('');
  const invRows = state.finance.invoices.map(i => {
    const c = clientById(i.clientId);
    return '<tr><td>' + esc(i.label) + '</td><td>' + esc(c ? c.name : '—') + '</td><td>' + fmtINR(i.amount) + '</td><td>' + fmtDate(i.due) + (i.status === 'Overdue' ? ' <span class="overdue">OVERDUE</span>' : '') + '</td><td>' + statusPill(i.status === 'Paid' ? 'Done' : i.status === 'Overdue' ? 'Paused' : 'To Do').replace(/Done|Paused|To Do/g, m => i.status) + '</td><td>' + (i.status !== 'Paid' ? '<button class="btn small" onclick="markInvoicePaid(\'' + i.id + '\')">Mark paid</button>' : '') + '</td></tr>';
  }).join('');
  const cliOpts = state.clients.map(c => '<option value="' + c.id + '">' + esc(c.name) + '</option>').join('');
  const unpaid = state.finance.invoices.filter(i => i.status !== 'Paid');
  const agingCur = unpaid.filter(i => i.due >= todayISO()).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const aging30 = unpaid.filter(i => i.due < todayISO() && i.due >= addDays(-30)).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const aging30p = unpaid.filter(i => i.due < addDays(-30)).reduce((s, i) => s + (Number(i.amount) || 0), 0);
  const profRows = state.clients.map(c => {
    const cp = clientProfit(c);
    return '<tr><td>' + esc(c.name) + (c.demo ? ' <span class="pill amber">DEMO</span>' : '') + '</td><td>' + (cp ? fmtINR(cp.rev) : 'Not set') + '</td><td>' + (cp && cp.cost !== null ? fmtINR(cp.cost) + ' (demo est.)' : '—') + '</td><td>' + (cp && cp.profit !== null ? fmtINR(cp.profit) : '—') + '</td><td>' + (cp && cp.profit !== null ? Math.round(cp.profit / cp.rev * 100) + '%' : '—') + '</td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Revenue (this month)</div><div class="value lime">' + fmtINR(rev) + '</div><div class="sub">monthly retainers on client records</div></div>' +
    '<div class="card kpi"><div class="label">Expenses (this month) ' + demoTag() + '</div><div class="value">' + fmtINR(exp) + '</div><div class="sub">salaries, ads, tools, office</div></div>' +
    '<div class="card kpi"><div class="label">Profit</div><div class="value" style="color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmtINR(profit) + '</div><div class="sub">revenue minus expenses</div></div>' +
    '<div class="card kpi"><div class="label">Pending payments</div><div class="value">' + fmtINR(pendingPayments()) + '</div><div class="sub">' + state.finance.invoices.filter(i => i.status !== 'Paid').length + ' unpaid invoices</div></div>' +
    '<div class="card kpi"><div class="label">Cash in hand ' + demoTag() + '</div><div class="value">' + fmtINR(state.finance.cashInHand) + '</div><div class="sub"><input type="number" min="0" value="' + state.finance.cashInHand + '" onchange="updateCash(this.value)" style="max-width:150px;display:inline-block"> update</div></div>' +
  '</div>' +
  '<div class="grid2"><div class="card"><h3>Receivables aging</h3><div class="stat-grid">' +
    '<div class="stat"><div class="slabel">Not yet due</div><div class="svalue">' + fmtINR(agingCur) + '</div></div>' +
    '<div class="stat"><div class="slabel">Overdue 1–30 days</div><div class="svalue">' + fmtINR(aging30) + '</div></div>' +
    '<div class="stat"><div class="slabel">Overdue 30+ days</div><div class="svalue">' + fmtINR(aging30p) + '</div></div></div>' +
    '<p class="muted">Aging is computed from invoice due dates. Overdue invoices also raise an alert in the Alerts center.</p></div>' +
  '<div class="card"><h3>Profitability per client ' + demoTag() + '</h3><table><tr><th>Client</th><th>Revenue / mo</th><th>Est. cost / mo</th><th>Profit / mo</th><th>Margin</th></tr>' + profRows + '</table>' +
  '<p class="muted">Estimated cost is a demo figure (60% of revenue) for demo clients only. Real-client costs need actual salary and ad spend figures — see Sec. 11.</p></div></div>' +
  '<div class="grid2"><div class="card"><h3>Expenses ' + demoTag() + '</h3><table><tr><th>Item</th><th>Amount</th><th></th></tr>' + expRows + '</table>' +
  '<form onsubmit="addExpense(event)" style="margin-top:12px"><div class="form-grid"><div><label>Expense</label><input id="ex-label" required placeholder="e.g. Internet bill"></div><div><label>Amount (₹)</label><input id="ex-amount" type="number" min="0" required></div></div><div class="btnrow" style="margin-top:10px"><button class="btn small" type="submit">Add expense</button></div></form></div>' +
  '<div class="card"><h3>Invoices</h3><table><tr><th>Invoice</th><th>Client</th><th>Amount</th><th>Due</th><th>Status</th><th></th></tr>' + invRows + '</table>' +
  '<form onsubmit="addInvoice(event)" style="margin-top:12px"><div class="form-grid"><div><label>Client</label><select id="in-client">' + cliOpts + '</select></div><div><label>Amount (₹)</label><input id="in-amount" type="number" min="0" required></div></div>' +
  '<div class="form-grid"><div><label>Due date</label><input id="in-due" type="date" required value="' + addDays(7) + '"></div><div><label>Label</label><input id="in-label" required placeholder="e.g. Monthly retainer"></div></div>' +
  '<div class="btnrow" style="margin-top:10px"><button class="btn small" type="submit">Add invoice</button></div></form></div></div>' +
  '<div class="note"><b>Demo figures:</b> expenses, cash in hand and invoice amounts are demo data. Revenue is computed from the real amounts on your client records. Edit or delete any row to make it real.</div>';
}
function addExpense(ev) {
  ev.preventDefault();
  state.finance.expenses.push({ id: uid(), label: $('#ex-label').value.trim(), amount: Number($('#ex-amount').value) || 0 });
  logActivity('Expense added: ' + $('#ex-label').value.trim() + ' (' + fmtINR($('#ex-amount').value) + ').');
  save(); render();
}
function deleteExpense(id) {
  const e = state.finance.expenses.find(x => x.id === id); if (!e) return;
  if (!confirm('Delete expense “' + e.label + '”?')) return;
  state.finance.expenses = state.finance.expenses.filter(x => x.id !== id);
  save(); render();
}
function addInvoice(ev) {
  ev.preventDefault();
  state.finance.invoices.push({ id: uid(), clientId: $('#in-client').value, label: $('#in-label').value.trim(), amount: Number($('#in-amount').value) || 0, due: $('#in-due').value, status: 'Pending' });
  logActivity('Invoice added: ' + $('#in-label').value.trim() + ' (' + fmtINR($('#in-amount').value) + ').');
  save(); render();
}
function markInvoicePaid(id) {
  const i = state.finance.invoices.find(x => x.id === id); if (!i) return;
  i.status = 'Paid';
  logActivity('Invoice marked paid: ' + i.label + ' (' + fmtINR(i.amount) + ').');
  save(); render();
}
function updateCash(val) {
  state.finance.cashInHand = Math.max(0, Number(val) || 0);
  save(); render();
}

/* ---------------- CRM / Sales pipeline (Sec. 4) ---------------- */
function viewCRM() {
  const total = state.leads.length;
  const won = state.leads.filter(l => l.stage === 'Won / Contracted');
  const lost = state.leads.filter(l => l.stage === 'Lost');
  const conv = (won.length + lost.length) ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
  const openLeads = state.leads.filter(l => !['Won / Contracted', 'Lost'].includes(l.stage));
  const pipeVal = openLeads.reduce((s, l) => s + (Number(l.value) || 0), 0);
  const expected = openLeads.reduce((s, l) => s + (Number(l.value) || 0) * (CRM_WEIGHTS[l.stage] || 0), 0);
  const sources = {};
  state.leads.forEach(l => { sources[l.source] = sources[l.source] || { n: 0, won: 0, val: 0 }; sources[l.source].n++; sources[l.source].val += Number(l.value) || 0; if (l.stage === 'Won / Contracted') sources[l.source].won++; });
  const srcRows = Object.keys(sources).map(s => '<tr><td>' + esc(s) + '</td><td>' + sources[s].n + '</td><td>' + sources[s].won + '</td><td>' + fmtINR(sources[s].val) + '</td></tr>').join('');
  const flow = CRM_STAGES.map(s => {
    const n = state.leads.filter(l => l.stage === s).length;
    return '<span class="fstep' + (n ? ' on' : '') + '">' + esc(s) + ' · ' + n + '</span>';
  }).join('<span class="farrow">→</span>');
  const kanban = CRM_STAGES.map(s => {
    const items = state.leads.filter(l => l.stage === s);
    const cards = items.map(l => {
      const idx = CRM_STAGES.indexOf(l.stage);
      return '<div class="kcard"><b>' + esc(l.name) + '</b><div class="muted">' + esc(l.service) + ' · ' + esc(l.source) + '</div><div class="muted">' + fmtINR(l.value) + ' · added ' + fmtDate(l.createdAt) + '</div><div class="btnrow">' +
        (idx < 8 ? '<button class="btn small" onclick="setLeadStage(\'' + l.id + '\',\'' + CRM_STAGES[idx + 1] + '\')">Advance →</button>' : '') +
        (idx <= 4 ? '<button class="btn danger small" onclick="setLeadStage(\'' + l.id + '\',\'Lost\')">Lost</button>' : '') + '</div></div>';
    }).join('') || '<p class="empty">—</p>';
    return '<div class="kcol"><h3>' + esc(s) + ' <span class="count">' + items.length + '</span></h3>' + cards + '</div>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total leads ' + demoTag() + '</div><div class="value">' + total + '</div><div class="sub">' + state.leads.filter(l => l.createdAt >= addDays(-7)).length + ' new this week</div></div>' +
    '<div class="card kpi"><div class="label">Won / Contracted</div><div class="value lime">' + won.length + '</div><div class="sub">conversion ' + conv + '% (won / decided)</div></div>' +
    '<div class="card kpi"><div class="label">Open pipeline value</div><div class="value">' + fmtINR(pipeVal) + '</div><div class="sub">stage-weighted expected ' + fmtINR(Math.round(expected)) + '</div></div>' +
  '</div>' +
  '<div class="card"><h3>Client lifecycle — Sec. 4</h3><div class="flow" style="margin-top:10px">' + flow + '</div><p class="muted" style="margin-top:10px">New Lead → Qualified → Discovery → Proposal Sent → Negotiation → Won / Contracted → Onboarding → Active → Renewal. Advance moves a lead to the next stage; a Won lead becomes a client — add them on the Clients page.</p></div>' +
  '<div class="kanban">' + kanban + '</div>' +
  '<div class="grid2"><div class="card"><h3>Leads by source</h3><table><tr><th>Source</th><th>Leads</th><th>Won</th><th>Total value</th></tr>' + srcRows + '</table></div>' +
  '<div class="card"><h3>Add a lead</h3><form onsubmit="addLead(event)">' +
  '<label>Name / business</label><input id="ld-name" required placeholder="e.g. Sharma Jewellers">' +
  '<div class="form-grid"><div><label>Source</label><select id="ld-source"><option>Meta</option><option>Google</option><option>Referral</option><option>Instagram</option><option>LinkedIn</option></select></div>' +
  '<div><label>Service needed</label><input id="ld-service" required placeholder="e.g. Meta Ads"></div></div>' +
  '<label>Deal value (₹)</label><input id="ld-value" type="number" min="0" required>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add lead</button></div></form></div></div>';
}
function addLead(ev) {
  ev.preventDefault();
  state.leads.unshift({ id: uid(), name: $('#ld-name').value.trim(), source: $('#ld-source').value, service: $('#ld-service').value.trim(), value: Number($('#ld-value').value) || 0, stage: 'New Lead', createdAt: todayISO() });
  logActivity('New lead added: ' + $('#ld-name').value.trim() + ' (' + $('#ld-source').value + ').');
  save(); render();
}
function setLeadStage(id, stage) {
  const l = state.leads.find(x => x.id === id); if (!l) return;
  l.stage = stage;
  logActivity('Lead “' + l.name + '” moved to ' + stage + '.');
  save(); render();
}

/* ---------------- Marketing overview ---------------- */
function viewMarketing() {
  const spend = state.marketing.reduce((s, c) => s + c.spend, 0);
  const leads = state.marketing.reduce((s, c) => s + c.leads, 0);
  const revenue = state.marketing.reduce((s, c) => s + c.revenue, 0);
  const rows = state.marketing.map(c =>
    '<tr><td><b>' + esc(c.name) + '</b> ' + demoTag() + '</td><td>' + esc(c.channel) + '</td><td>' + fmtINR(c.budget || 0) + '</td><td>' + fmtINR(c.spend) + '</td><td>' + c.leads + '</td><td>' + (c.conversions || 0) + '</td><td>' + fmtINR((c.conversions || 0) ? Math.round(c.spend / c.conversions) : 0) + '</td><td>' + fmtINR(c.revenue) + '</td><td>' + (c.spend ? (c.revenue / c.spend).toFixed(1) + 'x' : '—') + '</td><td>' + statusPill(c.status) + '</td></tr>'
  ).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total spend ' + demoTag() + '</div><div class="value">' + fmtINR(spend) + '</div><div class="sub">Meta + Google + LinkedIn</div></div>' +
    '<div class="card kpi"><div class="label">Total leads ' + demoTag() + '</div><div class="value">' + leads + '</div><div class="sub">across all channels</div></div>' +
    '<div class="card kpi"><div class="label">Revenue attributed ' + demoTag() + '</div><div class="value lime">' + fmtINR(revenue) + '</div><div class="sub">blended ROAS ' + (spend ? (revenue / spend).toFixed(1) + 'x' : '—') + '</div></div>' +
  '</div>' +
  '<div class="card"><h3>All campaigns — one table</h3><table><tr><th>Campaign</th><th>Channel</th><th>Budget</th><th>Spend</th><th>Leads</th><th>Conv.</th><th>CPA</th><th>Revenue</th><th>ROAS</th><th>Status</th></tr>' + rows + '</table>' +
  '<p class="muted">ROAS = revenue / spend. All figures here are demo — connect Meta Ads (and Google / LinkedIn accounts) for live numbers.</p></div>';
}

/* ---------------- Company goals ---------------- */
function viewGoals() {
  const activeN = state.clients.filter(c => c.status === 'Active').length;
  const cards = state.companyGoals.map(g => {
    const cur = g.label === 'Active clients' ? activeN : g.current;
    const pct = g.target ? Math.min(100, Math.round(cur / g.target * 100)) : 0;
    return '<div class="card"><h3>' + esc(g.label) + ' ' + (g.demo ? '<span class="pill amber">DEMO</span>' : '') + '</h3>' +
      '<div style="font-size:26px;font-weight:800">' + (g.unit === '₹' ? fmtINR(cur) : cur) + ' <span class="muted" style="font-size:16px">/ ' + (g.unit === '₹' ? fmtINR(g.target) : g.target) + '</span></div>' +
      '<div class="progress" style="margin:12px 0"><i style="width:' + pct + '%"></i></div>' +
      '<div class="muted">' + pct + '% achieved</div>' +
      '<div class="form-grid" style="margin-top:12px"><div><label>Target</label><input type="number" min="0" value="' + g.target + '" onchange="updateGoal(\'' + g.id + '\',\'target\',this.value)"></div>' +
      '<div><label>Current</label><input type="number" min="0" value="' + cur + '" ' + (g.label === 'Active clients' ? 'disabled' : '') + ' onchange="updateGoal(\'' + g.id + '\',\'current\',this.value)"></div></div>' +
      (g.label === 'Active clients' ? '<p class="muted">Current is live — counted from your active clients.</p>' : '') +
      '<div class="btnrow" style="margin-top:10px"><button class="btn danger small" onclick="deleteGoal(\'' + g.id + '\')">Delete goal</button></div></div>';
  }).join('');
  return '' +
  '<div class="grid2">' + cards + '</div>' +
  '<div class="card"><h3>Add a quarterly goal</h3><form onsubmit="addGoal(event)"><div class="form-grid">' +
  '<div><label>Goal</label><input id="g-label" required placeholder="e.g. Monthly revenue"></div>' +
  '<div><label>Target</label><input id="g-target" type="number" min="0" required></div></div>' +
  '<div class="form-grid"><div><label>Current</label><input id="g-current" type="number" min="0" value="0"></div>' +
  '<div><label>Unit</label><select id="g-unit"><option value="">Number</option><option value="₹">₹ (money)</option></select></div></div>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add goal</button></div></form>' +
  '<p class="muted">Quarterly goals are reviewed every week. Progress bars update as you change the current value.</p></div>';
}
function updateGoal(id, field, val) {
  const g = state.companyGoals.find(x => x.id === id); if (!g) return;
  g[field] = Math.max(0, Number(val) || 0);
  save(); render();
}
function addGoal(ev) {
  ev.preventDefault();
  state.companyGoals.push({ id: uid(), label: $('#g-label').value.trim(), target: Number($('#g-target').value) || 0, current: Number($('#g-current').value) || 0, unit: $('#g-unit').value, demo: false });
  logActivity('New company goal added: ' + $('#g-label').value.trim() + '.');
  save(); render();
}
function deleteGoal(id) {
  const g = state.companyGoals.find(x => x.id === id); if (!g) return;
  if (!confirm('Delete goal “' + g.label + '”?')) return;
  state.companyGoals = state.companyGoals.filter(x => x.id !== id);
  save(); render();
}

/* ---------------- Reports ---------------- */
function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(v => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
}
function exportTasksCSV() {
  const rows = [['Title', 'Assignee', 'Client', 'Deadline', 'Priority', 'Status', 'Completed on']];
  state.tasks.forEach(t => rows.push([t.title, (empById(t.assigneeId) || {}).name || '', (clientById(t.clientId) || {}).name || '', t.deadline, t.priority, t.status, t.completedAt || '']));
  downloadCSV('agencyos-tasks.csv', rows);
}
function exportClientsCSV() {
  const rows = [['Client', 'Service', 'Niche', 'Status', 'Deadline', 'Amount per month', 'Open tasks']];
  state.clients.forEach(c => rows.push([c.name, c.service, c.niche, c.status, c.deadline || '', c.amount || '', state.tasks.filter(t => t.clientId === c.id && t.status !== 'done').length]));
  downloadCSV('agencyos-clients.csv', rows);
}
function viewReports() {
  const weekStart = addDays(-7);
  const doneWeek = state.tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= weekStart);
  const newLeads = state.leads.filter(l => l.createdAt >= weekStart);
  const rev = financeRevenue();
  const attTodayRec = state.attendance[todayISO()] || {};
  const present = state.employees.filter(e => attToday(e.id) === 'Present' || attToday(e.id) === 'Late').length;
  const perEmp = {};
  doneWeek.forEach(t => { perEmp[t.assigneeId] = (perEmp[t.assigneeId] || 0) + 1; });
  let topId = null, topN = 0;
  Object.keys(perEmp).forEach(id => { if (perEmp[id] > topN) { topN = perEmp[id]; topId = id; } });
  const topName = topId ? (empById(topId) || {}).name : '—';
  const mSpend = state.marketing.reduce((s, c) => s + c.spend, 0);
  const mLeads = state.marketing.reduce((s, c) => s + c.leads, 0);
  const mRev = state.marketing.reduce((s, c) => s + c.revenue, 0);
  const mConv = state.marketing.reduce((s, c) => s + (c.conversions || 0), 0);
  const seoOpenN = state.seoIssues.filter(i => i.status !== 'Fixed').length;
  const metricRow = (area, metrics) => '<tr><td><b>' + area + '</b></td><td>' + metrics + '</td></tr>';
  return '' +
  '<div class="card"><h3>Weekly summary — read in one minute</h3><ul class="feed">' +
  '<li><b>' + doneWeek.length + ' tasks completed</b> this week · ' + state.tasks.filter(t => t.status !== 'done').length + ' still open · ' + state.tasks.filter(isOverdue).length + ' overdue right now.</li>' +
  '<li><b>' + newLeads.length + ' new leads</b> this week · ' + state.leads.filter(l => l.stage === 'Won / Contracted').length + ' total won · pipeline value ' + fmtINR(state.leads.filter(l => !['Won / Contracted', 'Lost'].includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0)) + '.</li>' +
  '<li><b>Revenue ' + fmtINR(rev) + ' / month</b> from retainers · ' + fmtINR(pendingPayments()) + ' in unpaid invoices · cash in hand ' + fmtINR(state.finance.cashInHand) + '.</li>' +
  '<li><b>Attendance today:</b> ' + present + ' of ' + state.employees.length + ' present.</li>' +
  '<li><b>Top performer this week:</b> ' + esc(topName) + (topN ? ' — ' + topN + ' tasks completed.' : ' — no completions recorded yet.') + '</li>' +
  '<li><b>Alerts open:</b> ' + alertCount() + ' — see the Alerts center for the full list.</li></ul></div>' +
  '<div class="card"><h3>Reports &amp; analytics — Sec. 15</h3><p class="muted">Every metric below states its source. Platform-reported numbers are labeled demo until the real account is connected; CRM-confirmed outcomes come from your own records.</p><table style="margin-top:12px"><tr><th>Area</th><th>Metrics (this period)</th></tr>' +
  metricRow('Agency finance', 'Revenue ' + fmtINR(rev) + ' · cash collected ' + fmtINR(state.finance.invoices.filter(i => i.status === 'Paid').reduce((s, i) => s + i.amount, 0)) + ' · expenses ' + fmtINR(financeExpenses()) + ' · gross margin ' + (rev ? Math.round((rev - financeExpenses()) / rev * 100) : 0) + '% · receivables ' + fmtINR(pendingPayments())) +
  metricRow('Sales', state.leads.length + ' leads · ' + state.leads.filter(l => l.stage === 'Won / Contracted').length + ' won · win rate ' + (state.leads.filter(l => ['Won / Contracted', 'Lost'].includes(l.stage)).length ? Math.round(state.leads.filter(l => l.stage === 'Won / Contracted').length / state.leads.filter(l => ['Won / Contracted', 'Lost'].includes(l.stage)).length * 100) : 0) + '% · pipeline ' + fmtINR(state.leads.filter(l => !['Won / Contracted', 'Lost'].includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0))) +
  metricRow('Client success', state.clients.filter(c => c.status === 'Active').length + ' active / ' + state.clients.length + ' total · retention ' + (state.clients.length ? Math.round(state.clients.filter(c => c.status === 'Active').length / state.clients.length * 100) : 0) + '% · at-risk ' + state.clients.filter(c => state.tasks.some(t => t.clientId === c.id && isOverdue(t))).length) +
  metricRow('Delivery', doneWeek.length + ' tasks done this week · on-time rate ' + (state.tasks.filter(t => t.status === 'done').length ? Math.round(onTimeDone(state.tasks.filter(t => t.status === 'done')) / state.tasks.filter(t => t.status === 'done').length * 100) : 0) + '% · ' + state.projects.filter(p => p.status === 'On track').length + '/' + state.projects.length + ' projects on track') +
  metricRow('Social media', state.posts.filter(p => p.status === 'Published').length + ' published · ' + state.posts.filter(p => p.status === 'Scheduled').length + ' scheduled · ' + state.posts.filter(p => p.status === 'Review').length + ' awaiting approval (demo calendar)') +
  metricRow('SEO', state.keywords.length + ' keywords tracked · ' + seoOpenN + ' technical issues open · 1,240 organic clicks / 18,500 impressions (demo sample)') +
  metricRow('Paid media', 'Spend ' + fmtINR(mSpend) + ' · leads ' + mLeads + ' · conversions ' + mConv + ' · CPA ' + fmtINR(mConv ? Math.round(mSpend / mConv) : 0) + ' · ROAS ' + (mSpend ? (mRev / mSpend).toFixed(1) + 'x' : '—') + ' (demo)') +
  metricRow('People', state.employees.length + ' headcount · ' + present + ' present today · utilization ' + (state.employees.length ? Math.round(state.tasks.filter(t => t.status !== 'done').length / (state.employees.length * ((state.settings && state.settings.capacity) || 5)) * 100) : 0) + '% · ' + state.leaveRequests.filter(r => r.status === 'Pending').length + ' leave request(s) pending') +
  '</table></div>' +
  '<div class="card"><h3>Export</h3><p class="muted">Download your data as CSV files — open them in Excel or Google Sheets.</p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" onclick="exportTasksCSV()">Download tasks CSV</button><button class="btn" onclick="exportClientsCSV()">Download clients CSV</button></div></div>';
}
