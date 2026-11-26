# AgencyOS — CEO Dashboard

A single-page CEO dashboard for a digital marketing agency. Track the whole
company from one place: team, tasks, clients, Meta Ads, social accounts,
deadlines, attendance, performance, workload and activity.

## Run

Double-click `index.html`, or serve the folder:

```
python3 -m http.server 8000
```

then open http://localhost:8000/

No build step, no framework, no server needed. Data is stored in the
browser (localStorage, key `agencyos-v1`). Open the same page in two tabs
and changes sync live between tabs.

## What is real and what is demo

- **Real:** the two clients Amarendra Nath Sasmal and Alexx Roy, with only
  their verified LinkedIn results (profile views, impressions, search
  appearances, followers). Their deadlines and amounts are intentionally
  blank — fill them in from the Clients page.
- **Demo (clearly labeled DEMO):** the five teammates, the three extra
  clients, all tasks, Meta Ads campaigns and numbers, social stats and
  team-cost salary figures. Replace them with real records from the Team,
  Clients and Tasks pages, or press “Reset demo data” in Settings to start
  over.

## Features

- **CEO Overview** — monthly revenue, tasks done vs pending, team working
  today, Meta Ads spend/leads, on-time rate, tasks completed (last 7 days),
  at-risk items, upcoming deadlines, recent activity.
- **Team** — roles and responsibilities, current task, workload status,
  completion rate; click a teammate for full detail, performance and
  monthly goal. Post company announcements from here.
- **Tasks** — To Do / Doing / Done board, filters by person, client and
  status; assign, edit, delete; moving to Done records the completion date
  so on-time vs late is honest.
- **Clients** — client list and detail (deadline, amount, notes, LinkedIn
  results, tasks), plus per-client profitability (demo estimates).
- **Meta Ads** — spend, reach, leads, cost per lead, campaign table. All
  demo until you connect Meta Business (instructions on the page).
- **Connections** — WhatsApp, Instagram, Facebook, LinkedIn, Threads.
  Real live numbers need the official account login per platform.
- **Deadlines** — every client and task deadline, soonest first, overdue
  highlighted.
- **Attendance & Leave** — daily attendance per teammate (Present / Late /
  On leave / Absent) and leave requests the CEO approves or rejects.
- **Performance** — on-time vs late per teammate, completion rate,
  On track / At risk flags, monthly goals, and team cost (demo).
- **Workload** — open tasks per person against a capacity of 5, so the CEO
  sees who is overloaded and who is free.
- **Activity Log** — automatic log of task changes plus manual work entries.
- **Alerts Center** — one place for everything needing the CEO: overdue
  tasks, missed deadlines, pending leave approvals, unpaid invoices and
  at-risk clients. The sidebar shows the open alert count.
- **Finance** — monthly revenue (from client retainers), expenses,
  profit, pending payments and cash in hand; add expenses and invoices,
  mark invoices paid.
- **Sales Pipeline / Leads** — leads by source (Meta, Google, Referral,
  LinkedIn, Instagram), stage tracking (New → Won / Lost), conversion
  rate and open pipeline value.
- **Marketing** — all campaigns across Meta, Google and LinkedIn in one
  table with spend, leads, revenue and ROAS.
- **Company Goals** — quarterly goals with progress bars; targets and
  current values are editable. The Active-clients goal counts live.
- **Reports** — a one-minute weekly summary plus CSV export of tasks and
  clients.
- **Client health** — on the Clients page: active vs at-risk clients,
  retention, and who needs attention this week, plus per-client
  profitability (demo estimates).

## Going live / GitHub

This folder is the complete app. To put it on GitHub, create a repo and
upload these files; to host it free, drag the folder onto Netlify Drop
(app.netlify.com/drop) or import the repo on Vercel. Note: localStorage
data stays in each browser — for true multi-device sync the app needs a
small server and shared database, which is a separate step.
