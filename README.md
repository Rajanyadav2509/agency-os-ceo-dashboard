# AgencyOS — CEO Dashboard

A single-page CEO dashboard and digital marketing agency ERP, built from the
AgencyOS blueprint (Digital Marketing Agency ERP & CEO Command Center). Track
the whole company from one place: sales pipeline, proposals, projects,
social, content, SEO, paid ads, finance, HR, client portal and reports.

## Run

Double-click `index.html`, or serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000/

No build step, no framework, no server needed. Data is stored in the
browser (localStorage, key `agencyos-v1`). Open the same page in two tabs
and changes sync live between tabs.

## Login

First run shows a **Create your login** screen — Raj sets his own username
and password. Later visits show a login screen; the session survives a
refresh (sessionStorage) and a **Logout** button sits in the sidebar. The
login screen also offers a one-tap **Use demo login** (demo / demo) and a
**Reset login** link that clears the stored credentials. This is a
**demo login stored only in this browser** — the screens say so plainly.
This static site has no backend, so it is not real server security.

## Module structure (blueprint §3)

Sidebar groups, in order:

- **Command** — CEO Command Center (§13), Alerts
- **Sales** — CRM & Pipeline (§4 lifecycle kanban), Sales & Proposals (§10),
  Service Catalog (§5)
- **Delivery** — Projects (§5, progress from linked tasks), Tasks, Social
  Calendar (§6, Draft → Review → Approved → Scheduled → Published),
  Content Studio (§7 briefs + revision rounds), SEO (§8 keywords, audits,
  issues), Paid Ads (§9 budgets, spend, leads, conversions, CPA, ROAS),
  Clients, Client Portal (§14, read-only client view)
- **Business** — Finance (§11 invoices, expenses, receivables aging,
  per-client profitability), Marketing (all channels, ROAS), Goals,
  Reports (§15 metric tables + CSV export), Deadlines
- **People** — HR (§12 directory, utilization, leave), Team, Team Groups,
  Attendance & Leave, Performance, Workload, Activity Log
- **System** — Connections, Settings (§2 roles, workspace config, login)

## CEO Command Center (§13)

Business snapshot (MRR, collected cash, expenses, gross margin), sales
pipeline (new leads, qualified pipeline, proposals sent, win rate, expected
revenue, renewals), client portfolio (active, churn risk, revenue
concentration), delivery operations (projects on track, overdue deliverables,
utilization, capacity), campaign performance (spend, leads, conversions,
ROAS), social/content (planned, awaiting approval, scheduled, published),
SEO (clicks, impressions, issues, content shipped), finance (receivables,
overdue invoices, cash flow, profitability), people (headcount, availability,
utilization, leave), risk & approvals, and executive actions (approve,
assign owner / create task, export report, review pipeline). Every KPI
drills down to its source view.

## What is real and what is demo

- **Real:** the two clients Amarendra Nath Sasmal and Alexx Roy, with only
  their verified LinkedIn results (profile views, impressions, search
  appearances, followers). Their deadlines and amounts are intentionally
  blank — fill them in from the Clients page.
- **Real:** Raj's 8 social accounts on the Connections page and in the
  Client Portal, synced from his GitHub profile's "Let's Connect" section:
  LinkedIn, GitHub, Portfolio, Instagram, WhatsApp, Substack, X, Facebook.
  Each link opens in a new tab.
- **Demo (clearly labeled DEMO):** the five teammates, the three extra
  clients, all tasks, proposals, projects, posts, briefs, keywords, SEO
  issues, Meta Ads campaigns and numbers, expenses, cash in hand and
  team-cost salary figures. Replace them with real records from the Team,
  Clients and Tasks pages, or press “Reset demo data” in Settings to start
  over. Keyword positions and SEO clicks/impressions are demo samples —
  connect Search Console for live data.

## Features

- **CRM** — full §4 lifecycle: New Lead → Qualified → Discovery → Proposal
  Sent → Negotiation → Won / Contracted → Onboarding → Active → Renewal,
  plus Lost. Stage-weighted expected revenue, leads by source.
- **Sales & Proposals** — proposals with scope, fees, validity and versions;
  Draft → Sent → Negotiation → Accepted / Rejected.
- **Service Catalog** — packages, retainers and one-time services with
  deliverables and SLAs.
- **Projects** — status, owner, due date, progress computed from linked
  tasks; tasks link to projects from the task form.
- **Social Calendar** — content calendar with the §6 approval workflow;
  clients can approve posts and briefs from the Client Portal.
- **Content Studio** — creative briefs with type, owner, status and counted
  revision rounds.
- **SEO** — keyword map (intent, target page, priority, position), technical
  issue log, content plan.
- **Paid Ads** — campaigns with budget, spend, reach, leads, conversions,
  CPA and ROAS; over-budget campaigns are flagged.
- **Finance** — monthly revenue (from client retainers), expenses, profit,
  pending payments and cash in hand; add expenses and invoices, mark
  invoices paid; receivables aging and per-client profitability.
- **HR** — employee directory, attendance, leave approvals, capacity and
  utilization (capacity is configurable in Settings).
- **Client Portal** — read-only view of what a client sees: services,
  milestones, content/brief approvals, invoices, and Raj's social links.
  Internal notes, margins, other clients and credentials are never shown.
- **Team Groups** — members with Team IDs, phone/WhatsApp numbers, open
  tasks, one-tap WhatsApp/Call, and "Copy group task update" for pasting
  into a WhatsApp group.
- **Reports** — a one-minute weekly summary, §15 metric tables per area,
  and CSV export of tasks and clients.
- **Alerts Center** — overdue tasks, missed deadlines, pending leave
  approvals, unpaid invoices, at-risk clients, expiring proposals and
  renewals due. The sidebar shows the open alert count.

## Data model

localStorage key `agencyos-v1` holds: settings, employees, clients, tasks,
campaigns, connections, goals, attendance, leaveRequests, announcements,
finance, leads, marketing, companyGoals, activity — plus the blueprint
collections: proposals, services, projects, posts, briefs, keywords,
seoIssues. Older saved states migrate automatically (lead stages map to the
§4 lifecycle, campaigns gain budget/conversions, tasks link to their
client's project, connections are replaced by the 8 GitHub-profile
accounts). Login credentials live separately under key `agencyos-auth`;
the session flag lives in sessionStorage (`agencyos-session`).

## Going live / GitHub

This folder is the complete app. To put it on GitHub, create a repo and
upload these files; to host it free, drag the folder onto Netlify Drop
(app.netlify.com/drop) or import the repo on Vercel. Note: localStorage
data stays in each browser — for true multi-device sync the app needs a
small server and shared database, which is a separate step.
