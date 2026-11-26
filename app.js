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

/* ---------------- Seed data ---------------- */
function seed() {
  const emp = (name, role, status, resp, color) => ({ id: uid(), name, role, status, responsibilities: resp, color, demo: true });
  const employees = [
    emp('Priya Sharma', 'Content Writer', 'Working', ['LinkedIn content writing', 'Newsletter drafts', 'Client content calendars'], '#a259ff'),
    emp('Arjun Mehta', 'Video Editor', 'Working', ['Reels and video editing', 'YouTube video edits', 'Thumbnail design'], '#2997ff'),
    emp('Neha Patel', 'Social Media Executive', 'Working', ['Daily posting across clients', 'Community replies', 'Engagement tracking'], '#2fd47c'),
    emp('Rohit Verma', 'Ads Specialist', 'On leave', ['Meta Ads campaigns', 'Ad performance reports', 'Pixel and tracking setup'], '#ffb547'),
    emp('Sneha Iyer', 'Graphic Designer', 'Working', ['Carousels and creatives', 'Brand kits', 'Client presentations'], '#ff5f6d'),
  ];
  const E = i => employees[i].id;

  const clients = [
    { id: 'c-amarendra', name: 'Amarendra Nath Sasmal', service: 'LinkedIn Growth & Personal Branding', niche: 'Time Reset Mentor', startDate: '', deadline: '', amount: '', status: 'Active', demo: false,
      results: { profileViews: 1432, impressions: 1029, searchAppearances: 77, followers: 3058 },
      notes: 'Creator of the PACT Performance Framework. LinkedIn results are from his verified analytics.' },
    { id: 'c-alexx', name: 'Alexx Roy', service: 'LinkedIn Growth', niche: 'Freedom Lifestyle', startDate: '', deadline: '', amount: '', status: 'Active', demo: false,
      results: { profileViews: 533, impressions: 821, searchAppearances: 30, followers: 2740 },
      notes: 'Creator-focused personal brand. LinkedIn results are from his verified analytics.' },
    { id: 'c-fitlife', name: 'FitLife Gym', service: 'Instagram Growth', niche: 'Fitness', startDate: addDays(-40), deadline: addDays(10), amount: 25000, status: 'Active', demo: true,
      results: null, notes: 'Demo client.' },
    { id: 'c-techstart', name: 'TechStart Solutions', service: 'Meta Ads', niche: 'SaaS', startDate: addDays(-25), deadline: addDays(21), amount: 40000, status: 'Active', demo: true,
      results: null, notes: 'Demo client.' },
    { id: 'c-aroma', name: 'Cafe Aroma', service: 'Social Media Management', niche: 'Cafe', startDate: addDays(-60), deadline: addDays(5), amount: 15000, status: 'Active', demo: true,
      results: null, notes: 'Demo client.' },
  ];

  const T = (title, assignee, client, deadline, priority, status, completed) => ({
    id: uid(), title, assigneeId: assignee, clientId: client, deadline, priority, status,
    completedAt: completed || '', createdAt: addDays(-10),
  });
  const tasks = [
    T('LinkedIn carousel — PACT framework', E(0), 'c-amarendra', addDays(2), 'High', 'doing'),
    T('Weekly content calendar — Amarendra', E(0), 'c-amarendra', addDays(-1), 'High', 'todo'),
    T('Engagement replies — Amarendra LinkedIn', E(2), 'c-amarendra', addDays(0), 'Medium', 'doing'),
    T('Freedom Lifestyle — 3 LinkedIn posts', E(0), 'c-alexx', addDays(3), 'Medium', 'todo'),
    T('YouTube SEO pack — Alexx channel', E(1), 'c-alexx', addDays(6), 'Medium', 'doing'),
    T('Meta ad creatives — TechStart', E(3), 'c-techstart', addDays(4), 'High', 'todo'),
    T('Instagram reels — FitLife Gym (4)', E(1), 'c-fitlife', addDays(1), 'High', 'doing'),
    T('Monthly report — Cafe Aroma', E(2), 'c-aroma', addDays(-2), 'Medium', 'todo'),
    T('Client onboarding call — TechStart', E(4), 'c-techstart', addDays(-5), 'Medium', 'done', addDays(-5)),
    T('LinkedIn post — Time Reset morning routine', E(0), 'c-amarendra', addDays(-1), 'Medium', 'done', addDays(-1)),
    T('Carousel design — PACT results', E(4), 'c-amarendra', addDays(-4), 'High', 'done', addDays(-2)),
    T('Ad performance report — TechStart', E(3), 'c-techstart', addDays(-3), 'Medium', 'done', addDays(-3)),
    T('Reels batch — FitLife (week 2)', E(1), 'c-fitlife', addDays(-6), 'Medium', 'done', addDays(-6)),
    T('Newsletter draft — Amarendra', E(0), 'c-amarendra', addDays(-2), 'Medium', 'done', addDays(-4)),
  ];

  const campaigns = [
    { id: uid(), name: 'LinkedIn Growth — Lead Gen', platform: 'Meta', spend: 12500, reach: 48000, leads: 86, status: 'Active', demo: true },
    { id: uid(), name: 'Freedom Lifestyle — Brand Awareness', platform: 'Meta', spend: 8200, reach: 32500, leads: 41, status: 'Active', demo: true },
    { id: uid(), name: 'YouTube SEO — Traffic', platform: 'Meta', spend: 5000, reach: 21000, leads: 28, status: 'Paused', demo: true },
  ];

  const connections = [
    { id: uid(), platform: 'WhatsApp', handle: '', status: 'Not connected', followers: '—', postsWeek: '—', demo: true },
    { id: uid(), platform: 'Instagram', handle: '@errajanyadav_', status: 'Not connected', followers: '—', postsWeek: '—', demo: true },
    { id: uid(), platform: 'Facebook', handle: '', status: 'Not connected', followers: '—', postsWeek: '—', demo: true },
    { id: uid(), platform: 'LinkedIn', handle: '', status: 'Not connected', followers: '—', postsWeek: '—', demo: true },
    { id: uid(), platform: 'Threads', handle: '', status: 'Not connected', followers: '—', postsWeek: '—', demo: true },
  ];

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
    { id: uid(), name: 'Rahul Verma — Fitness Studio', source: 'Meta', service: 'Instagram Growth', value: 20000, stage: 'Proposal sent', createdAt: addDays(-4) },
    { id: uid(), name: 'Sharma Jewellers', source: 'Google', service: 'Meta Ads', value: 35000, stage: 'Contacted', createdAt: addDays(-2) },
    { id: uid(), name: 'Dr. Mehta Clinic', source: 'Referral', service: 'Social Media Management', value: 15000, stage: 'Won', createdAt: addDays(-12) },
    { id: uid(), name: 'Boutique Zara', source: 'Instagram', service: 'LinkedIn Growth', value: 18000, stage: 'New', createdAt: addDays(-1) },
    { id: uid(), name: 'Kavya Interiors', source: 'LinkedIn', service: 'Personal Branding', value: 30000, stage: 'Negotiation', createdAt: addDays(-6) },
    { id: uid(), name: 'City Dental Care', source: 'Google', service: 'Meta Ads', value: 22000, stage: 'Lost', createdAt: addDays(-15) },
  ];
  const marketing = [
    { id: uid(), name: 'LinkedIn Growth — Lead Gen', channel: 'Meta', spend: 12500, leads: 86, revenue: 60000, status: 'Active', demo: true },
    { id: uid(), name: 'Freedom Lifestyle — Brand Awareness', channel: 'Meta', spend: 8200, leads: 41, revenue: 40000, status: 'Active', demo: true },
    { id: uid(), name: 'Google Search — LinkedIn Growth', channel: 'Google', spend: 9000, leads: 34, revenue: 45000, status: 'Active', demo: true },
    { id: uid(), name: 'Google — YouTube SEO', channel: 'Google', spend: 6000, leads: 22, revenue: 28000, status: 'Paused', demo: true },
    { id: uid(), name: 'LinkedIn Ads — B2B Founders', channel: 'LinkedIn', spend: 15000, leads: 19, revenue: 60000, status: 'Active', demo: true },
  ];
  const companyGoals = [
    { id: uid(), label: 'Quarterly revenue', target: 500000, current: 285000, unit: '₹', demo: true },
    { id: uid(), label: 'Active clients', target: 10, current: 5, unit: '', demo: true },
    { id: uid(), label: 'New hires this quarter', target: 3, current: 1, unit: '', demo: true },
  ];

  return {
    settings: { agencyName: 'Raj Digital Agency', ceoName: 'Rajan Yadav', currency: '₹' },
    employees, clients, tasks, campaigns, connections, goals, attendance: {}, leaveRequests, announcements, finance, leads, marketing, companyGoals,
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
  const n = openTasksOf(empId).length;
  if (n >= 5) return { label: 'Overloaded', cls: 'red' };
  if (n === 0) return { label: 'Available', cls: 'green' };
  return { label: 'Balanced', cls: 'blue' };
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
const TITLES = { overview: 'CEO Overview', alerts: 'Alerts Center', team: 'Team', tasks: 'Tasks', clients: 'Clients', leads: 'Sales Pipeline', finance: 'Finance', marketing: 'Marketing', goals: 'Company Goals', reports: 'Reports', deadlines: 'Deadlines', attendance: 'Attendance & Leave', performance: 'Performance', workload: 'Workload', activity: 'Activity Log', ads: 'Meta Ads', connections: 'Connections', settings: 'Settings' };

function setView(v, param) {
  currentView = v; viewParam = param || null;
  document.querySelectorAll('#nav button').forEach(b => b.classList.toggle('active', b.dataset.view === v));
  $('#viewTitle').textContent = (v === 'team' && param) ? 'Team Member' : (v === 'clients' && param) ? 'Client' : TITLES[v];
  render(); window.scrollTo(0, 0);
}
function render() {
  const el = $('#view');
  if (currentView === 'overview') el.innerHTML = viewOverview();
  else if (currentView === 'team') el.innerHTML = viewParam ? viewTeamDetail(viewParam) : viewTeam();
  else if (currentView === 'tasks') el.innerHTML = viewTasks();
  else if (currentView === 'clients') el.innerHTML = viewParam ? viewClientDetail(viewParam) : viewClients();
  else if (currentView === 'ads') el.innerHTML = viewAds();
  else if (currentView === 'connections') el.innerHTML = viewConnections();
  else if (currentView === 'deadlines') el.innerHTML = viewDeadlines();
  else if (currentView === 'alerts') el.innerHTML = viewAlerts();
  else if (currentView === 'leads') el.innerHTML = viewLeads();
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
function viewOverview() {
  const done = state.tasks.filter(t => t.status === 'done');
  const pending = state.tasks.filter(t => t.status !== 'done');
  const overdue = state.tasks.filter(isOverdue);
  const working = state.employees.filter(e => e.status === 'Working').length;
  const activeClients = state.clients.filter(c => c.status === 'Active').length;
  const revenue = state.clients.reduce((s, c) => s + (Number(c.amount) || 0), 0);
  const spend = state.campaigns.reduce((s, c) => s + c.spend, 0);
  const leads = state.campaigns.reduce((s, c) => s + c.leads, 0);
  const onTime = onTimeDone(done), late = lateDone(done);
  const onTimeRate = done.length ? Math.round(onTime / done.length * 100) : 0;
  const overloaded = state.employees.filter(e => openTasksOf(e.id).length >= 5);

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
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Monthly retainer revenue</div><div class="value lime">' + fmtINR(revenue) + '</div><div class="sub">' + activeClients + ' active clients · amounts set on client records</div></div>' +
    '<div class="card kpi"><div class="label">Tasks</div><div class="value">' + done.length + ' done</div><div class="sub">' + pending.length + ' pending · ' + overdue.length + ' overdue · ' + onTimeRate + '% on time</div></div>' +
    '<div class="card kpi"><div class="label">Team working today</div><div class="value">' + working + ' / ' + state.employees.length + '</div><div class="sub">' + state.employees.filter(e => e.status === 'On leave').length + ' on leave · ' + state.employees.filter(e => e.status === 'Offline').length + ' offline</div></div>' +
    '<div class="card kpi"><div class="label">Meta Ads (demo)</div><div class="value">' + fmtINR(spend) + '</div><div class="sub">' + leads + ' leads · ' + fmtINR(leads ? Math.round(spend / leads) : 0) + ' cost per lead</div></div>' +
    '<div class="card kpi"><div class="label">Monthly team goals</div><div class="value">' + goalDoneMonth() + ' / ' + goalTargetMonth() + '</div><div class="sub">tasks completed this month vs team target</div></div>' +
  '</div>' +
  '<div class="grid2">' +
    '<div class="card"><h3>Tasks completed — last 7 days</h3><div class="chart">' + chart + '</div><p class="muted">On time: ' + onTime + ' · Late: ' + late + ' (of ' + done.length + ' completed)</p></div>' +
    '<div class="card"><h3>At risk — needs your attention</h3><ul class="feed">' + riskHtml + '</ul><div class="btnrow" style="margin-top:12px"><button class="btn ghost small" onclick="setView(\'alerts\')">Open alerts center</button></div></div>' +
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
      '<div class="progress"><i style="width:' + rate + '%"></i></div></div>' +
      '<div style="text-align:right;min-width:150px"><div>' + statusPill(e.status) + ' <span class="pill ' + wl.cls + '">' + wl.label + '</span></div>' +
      '<div class="emeta" style="margin-top:6px">' + open.length + ' open · ' + done.length + ' done · ' + rate + '% complete</div></div>' +
      '<button class="btn ghost small" onclick="setView(\'team\',\'' + e.id + '\')">View</button>' +
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
    '<div class="emeta">' + esc(e.role) + '</div></div>' +
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
  '<div class="card"><h3>Tasks for this client</h3>' + (ct.length ? '<table><tr><th>Task</th><th>Owner</th><th>Deadline</th><th>Status</th></tr>' + rows + '</table>' : '<p class="empty">No tasks for this client yet.</p>') + '</div>';
}

/* ---------------- Meta Ads ---------------- */
function viewAds() {
  const spend = state.campaigns.reduce((s, c) => s + c.spend, 0);
  const reach = state.campaigns.reduce((s, c) => s + c.reach, 0);
  const leads = state.campaigns.reduce((s, c) => s + c.leads, 0);
  const rows = state.campaigns.map(c =>
    '<tr><td><b>' + esc(c.name) + '</b> ' + demoTag() + '</td><td>' + esc(c.platform) + '</td><td>' + fmtINR(c.spend) + '</td><td>' + c.reach.toLocaleString('en-IN') + '</td><td>' + c.leads + '</td><td>' + fmtINR(c.leads ? Math.round(c.spend / c.leads) : 0) + '</td><td>' + statusPill(c.status) + '</td></tr>'
  ).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total spend ' + demoTag() + '</div><div class="value">' + fmtINR(spend) + '</div><div class="sub">across ' + state.campaigns.length + ' campaigns</div></div>' +
    '<div class="card kpi"><div class="label">Total reach ' + demoTag() + '</div><div class="value">' + reach.toLocaleString('en-IN') + '</div><div class="sub">people reached</div></div>' +
    '<div class="card kpi"><div class="label">Total leads ' + demoTag() + '</div><div class="value">' + leads + '</div><div class="sub">cost per lead ' + fmtINR(leads ? Math.round(spend / leads) : 0) + '</div></div>' +
  '</div>' +
  '<div class="card"><h3>Campaigns</h3><table><tr><th>Campaign</th><th>Platform</th><th>Spend</th><th>Reach</th><th>Leads</th><th>Cost / lead</th><th>Status</th></tr>' + rows + '</table></div>' +
  '<div class="card"><h3>Connect Meta Ads</h3><p class="muted">Every number on this page is demo data. Real spend, reach and leads appear only after you connect your Meta Business account — Meta does not share ad data without an official login.</p><button class="btn" onclick="openAdsConnect()">How to connect Meta Ads</button></div>';
}

/* ---------------- Connections ---------------- */
const DEMO_STATS = { WhatsApp: { f: '—', p: '—' }, Instagram: { f: '12,400', p: '9' }, Facebook: { f: '8,900', p: '6' }, LinkedIn: { f: '3,100', p: '4' }, Threads: { f: '2,300', p: '5' } };
function viewConnections() {
  const rows = state.connections.map(c => {
    const st = DEMO_STATS[c.platform] || { f: '—', p: '—' };
    const connected = c.status !== 'Not connected';
    return '<div class="conn-row"><div class="conn-icon">' + esc(c.platform[0]) + '</div>' +
      '<div class="grow"><b>' + esc(c.platform) + '</b> ' + (c.handle ? '<span class="muted">' + esc(c.handle) + '</span>' : '<span class="muted">no account linked</span>') +
      '<div class="muted">Followers: ' + st.f + ' ' + demoTag() + ' · Posts this week: ' + st.p + ' ' + demoTag() + '</div></div>' +
      '<div>' + (connected ? '<span class="pill green">' + esc(c.status) + '</span>' : '<span class="pill grey">Not connected</span>') + '</div>' +
      '<button class="btn ' + (connected ? 'ghost' : '') + ' small" onclick="openConnectModal(\'' + c.id + '\')">' + (connected ? 'Manage' : 'Connect') + '</button></div>';
  }).join('');
  return '' +
  '<div class="card">' + rows + '</div>' +
  '<div class="note"><b>Honest note:</b> real live numbers (followers, posts, messages) need the actual account login through the official connection for each platform. Until then, the stats above are clearly labeled demo samples. Connecting is a manual step you do once per account — the app has the connection panels ready.</div>';
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
  const CAP = 5;
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
function viewSettings() {
  return '' +
  '<div class="card"><h3>Agency settings</h3><form onsubmit="saveSettings(event)">' +
  '<label>Agency name</label><input id="set-agency" value="' + esc(state.settings.agencyName) + '">' +
  '<label>CEO name</label><input id="set-ceo" value="' + esc(state.settings.ceoName) + '">' +
  '<label>Currency</label><select id="set-cur"><option' + (state.settings.currency === '₹' ? ' selected' : '') + '>₹</option><option' + (state.settings.currency === '$' ? ' selected' : '') + '>$</option><option' + (state.settings.currency === '€' ? ' selected' : '') + '>€</option></select>' +
  '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save settings</button></div></form></div>' +
  '<div class="card"><h3>Data</h3><p class="muted">Everything is stored in this browser (localStorage). Demo employees, clients, campaigns and salary figures are marked DEMO — replace them with real records from the Team, Clients and Tasks pages. Real Meta Ads and social numbers need the official account connections on the Meta Ads and Connections pages.</p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn danger" onclick="resetDemo()">Reset demo data</button></div></div>';
}
function saveSettings(ev) {
  ev.preventDefault();
  state.settings.agencyName = $('#set-agency').value.trim() || 'My Agency';
  state.settings.ceoName = $('#set-ceo').value.trim() || 'CEO';
  state.settings.currency = $('#set-cur').value;
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
  openModal('<h2>' + (t ? 'Edit task' : 'New task') + '</h2><form onsubmit="saveTask(event,\'' + (id || '') + '\')">' +
    '<label>Title</label><input id="f-title" required value="' + esc(t ? t.title : '') + '">' +
    '<div class="form-grid"><div><label>Assign to</label><select id="f-assignee">' + empOpts + '</select></div>' +
    '<div><label>Client</label><select id="f-client">' + cliOpts + '</select></div></div>' +
    '<div class="form-grid"><div><label>Deadline</label><input id="f-deadline" type="date" value="' + (t ? t.deadline : '') + '"></div>' +
    '<div><label>Priority</label><select id="f-priority"><option' + (t && t.priority === 'High' ? ' selected' : '') + '>High</option><option' + (!t || t.priority === 'Medium' ? ' selected' : '') + '>Medium</option><option' + (t && t.priority === 'Low' ? ' selected' : '') + '>Low</option></select></div></div>' +
    '<label>Status</label><select id="f-status"><option value="todo"' + (!t || t.status === 'todo' ? ' selected' : '') + '>To Do</option><option value="doing"' + (t && t.status === 'doing' ? ' selected' : '') + '>Doing</option><option value="done"' + (t && t.status === 'done' ? ' selected' : '') + '>Done</option></select>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save task</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveTask(ev, id) {
  ev.preventDefault();
  const title = $('#f-title').value.trim();
  const assigneeId = $('#f-assignee').value, clientId = $('#f-client').value;
  const deadline = $('#f-deadline').value, priority = $('#f-priority').value, status = $('#f-status').value;
  const e = empById(assigneeId);
  if (id) {
    const t = state.tasks.find(x => x.id === id); if (!t) return;
    const wasDone = t.status === 'done';
    Object.assign(t, { title, assigneeId, clientId, deadline, priority, status });
    if (status === 'done' && !wasDone) t.completedAt = todayISO();
    if (status !== 'done') t.completedAt = '';
    logActivity('Task updated: “' + title + '” (' + (e ? e.name : '') + ').');
  } else {
    state.tasks.unshift({ id: uid(), title, assigneeId, clientId, deadline, priority, status, completedAt: status === 'done' ? todayISO() : '', createdAt: todayISO() });
    logActivity('New task assigned to ' + (e ? e.name : 'teammate') + ': “' + title + '”.');
  }
  save(); closeModal(); render();
}

function openEmployeeForm() {
  openModal('<h2>Add teammate</h2><form onsubmit="saveEmployee(event)">' +
    '<label>Name</label><input id="e-name" required placeholder="e.g. Rahul Kumar">' +
    '<label>Role</label><input id="e-role" required placeholder="e.g. SEO Executive">' +
    '<label>Status</label><select id="e-status"><option>Working</option><option>On leave</option><option>Offline</option></select>' +
    '<label>Responsibilities (one per line)</label><textarea id="e-resp" rows="3" placeholder="LinkedIn outreach&#10;Client reporting"></textarea>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Add teammate</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveEmployee(ev) {
  ev.preventDefault();
  const colors = ['#2997ff', '#a259ff', '#2fd47c', '#ffb547', '#ff5f6d', '#ff8a5c'];
  const resp = $('#e-resp').value.split('\n').map(s => s.trim()).filter(Boolean);
  state.employees.push({ id: uid(), name: $('#e-name').value.trim(), role: $('#e-role').value.trim(), status: $('#e-status').value, responsibilities: resp.length ? resp : ['General agency work'], color: colors[state.employees.length % colors.length], demo: false });
  logActivity('New teammate added: ' + $('#e-name').value.trim() + ' (' + $('#e-role').value.trim() + ').');
  save(); closeModal(); render();
}

function openClientForm(id) {
  const c = id ? clientById(id) : null;
  openModal('<h2>' + (c ? 'Edit client' : 'Add client') + '</h2><form onsubmit="saveClient(event,\'' + (id || '') + '\')">' +
    '<label>Client name</label><input id="c-name" required value="' + esc(c ? c.name : '') + '">' +
    '<div class="form-grid"><div><label>Service</label><input id="c-service" value="' + esc(c ? c.service : '') + '" placeholder="e.g. LinkedIn Growth"></div>' +
    '<div><label>Niche / business</label><input id="c-niche" value="' + esc(c ? c.niche : '') + '"></div></div>' +
    '<div class="form-grid"><div><label>Start date</label><input id="c-start" type="date" value="' + (c ? c.startDate : '') + '"></div>' +
    '<div><label>Project deadline</label><input id="c-deadline" type="date" value="' + (c ? c.deadline : '') + '"></div></div>' +
    '<div class="form-grid"><div><label>Amount / month (₹)</label><input id="c-amount" type="number" min="0" value="' + (c ? c.amount : '') + '"></div>' +
    '<div><label>Status</label><select id="c-status"><option' + (!c || c.status === 'Active' ? ' selected' : '') + '>Active</option><option' + (c && c.status === 'Paused' ? ' selected' : '') + '>Paused</option><option' + (c && c.status === 'Completed' ? ' selected' : '') + '>Completed</option></select></div></div>' +
    '<label>Notes</label><textarea id="c-notes" rows="2">' + esc(c ? c.notes || '' : '') + '</textarea>' +
    '<div class="btnrow" style="margin-top:14px"><button class="btn" type="submit">Save client</button><button class="btn ghost" type="button" onclick="closeModal()">Cancel</button></div></form>');
}
function saveClient(ev, id) {
  ev.preventDefault();
  const data = { name: $('#c-name').value.trim(), service: $('#c-service').value.trim(), niche: $('#c-niche').value.trim(), startDate: $('#c-start').value, deadline: $('#c-deadline').value, amount: $('#c-amount').value, status: $('#c-status').value, notes: $('#c-notes').value.trim() };
  if (id) { const c = clientById(id); if (c) { Object.assign(c, data); logActivity('Client updated: ' + c.name + '.'); } }
  else { state.clients.push(Object.assign({ id: uid(), demo: false, results: null }, data)); logActivity('New client added: ' + data.name + '.'); }
  save(); closeModal(); render();
}

function openConnectModal(id) {
  const c = state.connections.find(x => x.id === id); if (!c) return;
  const connected = c.status !== 'Not connected';
  openModal('<h2>' + esc(c.platform) + '</h2>' +
    '<p class="muted">Status: <b>' + esc(c.status) + '</b></p>' +
    '<div class="note"><b>How real connection works:</b> live followers, posts and messages come from the official ' + esc(c.platform) + ' login / Business account. Connect it once through the official flow — this dashboard only stores the connection, it never asks for your password here.</div>' +
    '<label>Account handle / number</label><input id="cn-handle" value="' + esc(c.handle || '') + '" placeholder="e.g. @youragency">' +
    '<div class="btnrow" style="margin-top:14px">' +
    (connected
      ? '<button class="btn danger" onclick="disconnectAccount(\'' + c.id + '\')">Disconnect (demo)</button>'
      : '<button class="btn" onclick="markConnected(\'' + c.id + '\')">Mark as connected (demo)</button>') +
    '<button class="btn ghost" onclick="closeModal()">Close</button></div>');
}
function markConnected(id) {
  const c = state.connections.find(x => x.id === id); if (!c) return;
  c.handle = $('#cn-handle').value.trim();
  c.status = 'Connected (demo)';
  logActivity(c.platform + ' account marked connected (demo).');
  save(); closeModal(); render();
}
function disconnectAccount(id) {
  const c = state.connections.find(x => x.id === id); if (!c) return;
  c.status = 'Not connected';
  logActivity(c.platform + ' account disconnected.');
  save(); closeModal(); render();
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

/* ---------------- Init ---------------- */
function init() {
  load();
  $('#topDate').textContent = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  document.querySelectorAll('#nav button').forEach(b => b.addEventListener('click', () => setView(b.dataset.view)));
  render();
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
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Revenue (this month)</div><div class="value lime">' + fmtINR(rev) + '</div><div class="sub">monthly retainers on client records</div></div>' +
    '<div class="card kpi"><div class="label">Expenses (this month) ' + demoTag() + '</div><div class="value">' + fmtINR(exp) + '</div><div class="sub">salaries, ads, tools, office</div></div>' +
    '<div class="card kpi"><div class="label">Profit</div><div class="value" style="color:' + (profit >= 0 ? 'var(--green)' : 'var(--red)') + '">' + fmtINR(profit) + '</div><div class="sub">revenue minus expenses</div></div>' +
    '<div class="card kpi"><div class="label">Pending payments</div><div class="value">' + fmtINR(pendingPayments()) + '</div><div class="sub">' + state.finance.invoices.filter(i => i.status !== 'Paid').length + ' unpaid invoices</div></div>' +
    '<div class="card kpi"><div class="label">Cash in hand ' + demoTag() + '</div><div class="value">' + fmtINR(state.finance.cashInHand) + '</div><div class="sub"><input type="number" min="0" value="' + state.finance.cashInHand + '" onchange="updateCash(this.value)" style="max-width:150px;display:inline-block"> update</div></div>' +
  '</div>' +
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

/* ---------------- Leads / Sales pipeline ---------------- */
const LEAD_STAGES = ['New', 'Contacted', 'Proposal sent', 'Negotiation', 'Won', 'Lost'];
function viewLeads() {
  const total = state.leads.length;
  const won = state.leads.filter(l => l.stage === 'Won');
  const lost = state.leads.filter(l => l.stage === 'Lost');
  const conv = (won.length + lost.length) ? Math.round(won.length / (won.length + lost.length) * 100) : 0;
  const pipeVal = state.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0);
  const sources = {};
  state.leads.forEach(l => { sources[l.source] = sources[l.source] || { n: 0, won: 0, val: 0 }; sources[l.source].n++; sources[l.source].val += Number(l.value) || 0; if (l.stage === 'Won') sources[l.source].won++; });
  const srcRows = Object.keys(sources).map(s => '<tr><td>' + esc(s) + '</td><td>' + sources[s].n + '</td><td>' + sources[s].won + '</td><td>' + fmtINR(sources[s].val) + '</td></tr>').join('');
  const rows = state.leads.map(l => {
    const idx = LEAD_STAGES.indexOf(l.stage);
    return '<tr><td><b>' + esc(l.name) + '</b></td><td>' + esc(l.source) + '</td><td>' + esc(l.service) + '</td><td>' + fmtINR(l.value) + '</td><td>' + fmtDate(l.createdAt) + '</td><td>' + statusPill(l.stage === 'Won' ? 'Done' : l.stage === 'Lost' ? 'Paused' : 'To Do').replace(/Done|Paused|To Do/g, m => l.stage) + '</td><td><div class="btnrow">' +
      (idx < 4 ? '<button class="btn small" onclick="setLeadStage(\'' + l.id + '\',\'' + LEAD_STAGES[idx + 1] + '\')">Advance →</button>' : '') +
      (l.stage !== 'Lost' && l.stage !== 'Won' ? '<button class="btn danger small" onclick="setLeadStage(\'' + l.id + '\',\'Lost\')">Lost</button>' : '') + '</div></td></tr>';
  }).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total leads ' + demoTag() + '</div><div class="value">' + total + '</div><div class="sub">' + state.leads.filter(l => l.createdAt >= addDays(-7)).length + ' new this week</div></div>' +
    '<div class="card kpi"><div class="label">Won</div><div class="value lime">' + won.length + '</div><div class="sub">conversion ' + conv + '% (won / decided)</div></div>' +
    '<div class="card kpi"><div class="label">Open pipeline value</div><div class="value">' + fmtINR(pipeVal) + '</div><div class="sub">leads not yet won or lost</div></div>' +
  '</div>' +
  '<div class="grid2"><div class="card"><h3>Leads by source</h3><table><tr><th>Source</th><th>Leads</th><th>Won</th><th>Total value</th></tr>' + srcRows + '</table></div>' +
  '<div class="card"><h3>Add a lead</h3><form onsubmit="addLead(event)">' +
  '<label>Name / business</label><input id="ld-name" required placeholder="e.g. Sharma Jewellers">' +
  '<div class="form-grid"><div><label>Source</label><select id="ld-source"><option>Meta</option><option>Google</option><option>Referral</option><option>Instagram</option><option>LinkedIn</option></select></div>' +
  '<div><label>Service needed</label><input id="ld-service" required placeholder="e.g. Meta Ads"></div></div>' +
  '<label>Deal value (₹)</label><input id="ld-value" type="number" min="0" required>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" type="submit">Add lead</button></div></form></div></div>' +
  '<div class="card"><h3>Pipeline</h3><table><tr><th>Lead</th><th>Source</th><th>Service</th><th>Value</th><th>Added</th><th>Stage</th><th></th></tr>' + rows + '</table>' +
  '<p class="muted">Advance moves a lead to the next stage. A Won lead is a new client — add them on the Clients page.</p></div>';
}
function addLead(ev) {
  ev.preventDefault();
  state.leads.unshift({ id: uid(), name: $('#ld-name').value.trim(), source: $('#ld-source').value, service: $('#ld-service').value.trim(), value: Number($('#ld-value').value) || 0, stage: 'New', createdAt: todayISO() });
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
    '<tr><td><b>' + esc(c.name) + '</b> ' + demoTag() + '</td><td>' + esc(c.channel) + '</td><td>' + fmtINR(c.spend) + '</td><td>' + c.leads + '</td><td>' + fmtINR(c.revenue) + '</td><td>' + (c.spend ? (c.revenue / c.spend).toFixed(1) + 'x' : '—') + '</td><td>' + statusPill(c.status) + '</td></tr>'
  ).join('');
  return '' +
  '<div class="kpis">' +
    '<div class="card kpi"><div class="label">Total spend ' + demoTag() + '</div><div class="value">' + fmtINR(spend) + '</div><div class="sub">Meta + Google + LinkedIn</div></div>' +
    '<div class="card kpi"><div class="label">Total leads ' + demoTag() + '</div><div class="value">' + leads + '</div><div class="sub">across all channels</div></div>' +
    '<div class="card kpi"><div class="label">Revenue attributed ' + demoTag() + '</div><div class="value lime">' + fmtINR(revenue) + '</div><div class="sub">blended ROAS ' + (spend ? (revenue / spend).toFixed(1) + 'x' : '—') + '</div></div>' +
  '</div>' +
  '<div class="card"><h3>All campaigns — one table</h3><table><tr><th>Campaign</th><th>Channel</th><th>Spend</th><th>Leads</th><th>Revenue</th><th>ROAS</th><th>Status</th></tr>' + rows + '</table>' +
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
  return '' +
  '<div class="card"><h3>Weekly summary — read in one minute</h3><ul class="feed">' +
  '<li><b>' + doneWeek.length + ' tasks completed</b> this week · ' + state.tasks.filter(t => t.status !== 'done').length + ' still open · ' + state.tasks.filter(isOverdue).length + ' overdue right now.</li>' +
  '<li><b>' + newLeads.length + ' new leads</b> this week · ' + state.leads.filter(l => l.stage === 'Won').length + ' total won · pipeline value ' + fmtINR(state.leads.filter(l => !['Won', 'Lost'].includes(l.stage)).reduce((s, l) => s + (Number(l.value) || 0), 0)) + '.</li>' +
  '<li><b>Revenue ' + fmtINR(rev) + ' / month</b> from retainers · ' + fmtINR(pendingPayments()) + ' in unpaid invoices · cash in hand ' + fmtINR(state.finance.cashInHand) + '.</li>' +
  '<li><b>Attendance today:</b> ' + present + ' of ' + state.employees.length + ' present.</li>' +
  '<li><b>Top performer this week:</b> ' + esc(topName) + (topN ? ' — ' + topN + ' tasks completed.' : ' — no completions recorded yet.') + '</li>' +
  '<li><b>Alerts open:</b> ' + alertCount() + ' — see the Alerts center for the full list.</li></ul></div>' +
  '<div class="card"><h3>Export</h3><p class="muted">Download your data as CSV files — open them in Excel or Google Sheets.</p>' +
  '<div class="btnrow" style="margin-top:12px"><button class="btn" onclick="exportTasksCSV()">Download tasks CSV</button><button class="btn" onclick="exportClientsCSV()">Download clients CSV</button></div></div>';
}
