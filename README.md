```
 ╔═════════════════════════════════════════════════════════════════════════════════════════╗
 ║  ┌──(logsentinel㉿root)-[~/incident-ops]                                                ║
 ║  └─$ ./launch_sentinel.sh --mode POSTGRESQL --ai GEMINI-1.5 --version 3.0.0-PRO         ║
 ║                                                                                         ║
 ║   ██╗      ██████╗  ██████╗ ███████╗███████╗███╗   ██╗████████╗██╗███╗   ██╗███████╗██╗   ║
 ║   ██║     ██╔═══██╗██╔════╝ ██╔════╝██╔════╝████╗  ██║╚══██╔══╝██║████╗  ██║██╔════╝██║   ║
 ║   ██║     ██║   ██║██║  ███╗███████╗█████╗  ██╔██╗ ██║   ██║   ██║██╔██╗ ██║█████╗  ██║   ║
 ║   ██║     ██║   ██║██║   ██║╚════██║██╔══╝  ██║╚██╗██║   ██║   ██║██║╚██╗██║██╔══╝  ██║   ║
 ║   ███████╗╚██████╔╝╚██████╔╝███████║███████╗██║ ╚████║   ██║   ██║██║ ╚████║███████╗███████╗
 ║   ╚══════╝ ╚═════╝  ╚═════╝ ╚══════╝╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝  ╚═══╝╚══════╝╚══════╝
 ║                                                                                         ║
 ║   [SYSTEM INITIALIZED]: LogSentinel AI — Autonomous Log Observability & SRE Platform     ║
 ╚═════════════════════════════════════════════════════════════════════════════════════════╝
```

<div align="center">

[![FastAPI](https://img.shields.io/badge/⚡_Backend-FastAPI_0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/⚛️_Frontend-React_19_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/🐘_Database-PostgreSQL_pgAdmin4-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Google Gemini](https://img.shields.io/badge/🧠_AI-Gemini_1.5_Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![WebSockets](https://img.shields.io/badge/📡_Stream-WebSockets_Live-000000?style=for-the-badge&logo=socketdotio&logoColor=white)](https://fastapi.tiangolo.com/advanced/websockets/)
[![Multi-Channel](https://img.shields.io/badge/🔔_Integrations-GitHub_Discord_Slack_Telegram_Jira_Linear-7289DA?style=for-the-badge)](https://github.com/)

</div>

---

### 🖥️ `SYS_DIAGNOSTICS // SYSTEM STATUS`

```console
[root@logsentinel-node-01 ~]# systemctl status logsentinel-pipeline.service
● logsentinel-pipeline.service - LogSentinel AI Log Ingestion & Bug Automated Reporting Engine
     Loaded: loaded (/etc/systemd/system/logsentinel-pipeline.service; enabled)
     Active: active (running) since Fri 2026-09-18 10:30:00 UTC; 5ms ago
   Main PID: 8000 (uvicorn-fastapi)
      Tasks: 16 (limit: 4915)
     Memory: 148.2M
        CPU: 135ms
     CGroup: /system.slice/logsentinel-pipeline.service
             ├─ 8000 /usr/bin/python3 main.py --host 0.0.0.0 --port 8000
             └─ 5173 node /client/node_modules/.bin/vite --host

[LOG_STREAM] Initializing PostgreSQL database 'NLP_log'... CONNECTED.
[LOG_STREAM] Loading Google Gemini 1.5 Flash AI Engine... READY.
[LOG_STREAM] WebSockets Live Stream Gateway... ONLINE.
[LOG_STREAM] GitHub REST, Discord, Slack, Telegram, Jira & Linear... ACTIVE.
```

---

### ⚡ `CAPABILITIES // CORE MODULES`

```bash
$ logsentinel-cli --list-modules

  [MOD-01] 🧠 GOOGLE GEMINI 1.5 FLASH AI ENGINE
           └─ End-to-end vector log parser, root-cause analyzer, and automated remediation engine.
           └─ Interactive LogSentinel Root-Cause Debugger: Real-time chat drawer for code patches & reproduction steps.

  [MOD-02] 📡 LIVE WEBSOCKET LOG STREAM TERMINAL
           └─ Real-time tailing terminal via WebSockets (/api/ws/logs) with pause/resume and live buffer scan.
           └─ Ingestion endpoint (/api/logs/stream) for background daemon scripts and log forwarders.

  [MOD-03] 🛡️ DEEP PII & SECRET REDACTION ENGINE
           └─ Automatic regex scrubbing of AWS access keys, JWT tokens, Bearer auth headers, database URIs with passwords,
              IP addresses, credit card patterns, and memory hex addresses before storage or AI processing.

  [MOD-04] ⚡ SEMANTIC VECTOR DEDUPLICATION & OCCURRENCE TRACKING
           └─ Deterministic error fingerprinting clusters repeated stack traces.
           └─ Increments occurrence counters (e.g., "14x Occurrences") and updates last seen timestamps.

  [MOD-05] 🐘 POSTGRESQL & SQLITE DUAL ENGINE
           └─ Primary: Enterprise PostgreSQL database with auto-creation and non-destructive migrations.
           └─ Fallback: Zero-config local SQLite database (logs.db) with seamless connection routing.

  [MOD-06] 🔔 MULTI-CHANNEL ENTERPRISE ALERTING
           └─ GitHub Issues: 1-click issue creator with traceback markdown and patch suggestions.
           └─ Discord & Slack: Rich priority color-coded embed cards and Block Kit templates.
           └─ Telegram: Instant bot alerts with severity indicators.
           └─ Jira Cloud & Linear: Automated creation of bug tickets and engineering issues.

  [MOD-07] 📊 OBSERVABILITY DASHBOARD & MTTR ANALYTICS
           └─ Mean Time To Resolution (MTTR) calculation, error trend distribution charts, and full-text search.
```

---

### 📁 `DIRECTORY_TREE // REPOSITORY MAP`

```console
nlp-log-processor-and-bug-reporter/
├── 📄 main.py               # FastAPI Gateway (REST, WebSockets, streaming ingest, chat endpoints)
├── 📄 database.py           # Dual PostgreSQL (psycopg2) & SQLite ORM with deduplication & MTTR
├── 📄 nlp_engine.py         # Google Gemini 1.5 Flash AI Engine, deep secret scrubber & debug chat
├── 📄 integrations.py       # Multi-Channel Dispatcher (GitHub, Discord, Slack, Telegram, Jira, Linear)
├── 📄 exporter.py           # Audit report exporter (Excel/CSV)
├── 📄 .env.local            # Environment configuration (Gemini API Key, PostgreSQL, Webhooks)
├── 📄 requirements.txt      # Python backend dependencies (FastAPI, WebSockets, Gemini, Psycopg2)
└── 📁 client/               # React 19 + TypeScript + Vite + Tailwind Dashboard UI
    ├── 📄 package.json      # Node dependencies
    ├── 📁 public/           # Static assets & icons
    └── 📁 src/
        ├── 📄 App.tsx       # Cyberpunk Observability Dashboard, Terminal Streamer & LogSentinel Drawer
        ├── 📄 App.css       # Custom glassmorphism & mesh background styles
        └── 📄 index.css     # Tailwind CSS base system
```

---

### 🚀 `QUICKSTART // RUNNING LOGSENTINEL`

#### 1️⃣ Clone & Configure Environment
```bash
$ git clone https://github.com/Rajan3103/nlp-log-processor-and-bug-reporter.git
$ cd nlp-log-processor-and-bug-reporter

$ cat << 'EOF' > .env.local
# Google Gemini AI Credentials (Required)
GEMINI_API_KEY=your_gemini_api_key_here

# PostgreSQL Database Configuration (pgAdmin 4 / Supabase / Neon)
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=root123
PGDATABASE=NLP_log

# Optional Multi-Channel Integration Credentials
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO=username/repository
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
TELEGRAM_BOT_TOKEN=123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ
TELEGRAM_CHAT_ID=-100123456789
JIRA_URL=https://your-domain.atlassian.net
JIRA_EMAIL=dev@company.com
JIRA_API_TOKEN=your_jira_token
JIRA_PROJECT_KEY=BUG
LINEAR_API_KEY=lin_api_xxxxxxxxxxxx
EOF
```

#### 2️⃣ Launch Backend Engine (Python 3.10+)
```bash
$ pip install -r requirements.txt
$ python main.py

# [OUTPUT]:
# INFO:     Started server process [8000]
# INFO:     Waiting for application startup.
# [Database] PostgreSQL connected successfully to 'NLP_log'.
# INFO:     Application startup complete.
# INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
```

#### 3️⃣ Launch Frontend Terminal Interface (Node 18+)
```bash
$ cd client
$ npm install
$ npm run dev

# [OUTPUT]:
#  VITE v8.0.10  ready in 250 ms
#  ➜  Local:   http://localhost:5173/
#  ➜  Network: use --host to expose
```

---

### 📊 `DB_SCHEMA // DATA MODEL`

```sql
-- Table: public.bug_reports
CREATE TABLE bug_reports (
    id                     SERIAL PRIMARY KEY,
    description            TEXT NOT NULL,
    category               VARCHAR(100) NOT NULL,
    priority               VARCHAR(50) NOT NULL,
    source_file            VARCHAR(255) NOT NULL,
    timestamp              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_content            TEXT,
    status                 VARCHAR(50) DEFAULT 'Open',
    verified               INTEGER DEFAULT 0,
    solution               TEXT,
    github_issue_url       TEXT,
    occurrence_count       INTEGER DEFAULT 1,
    fingerprint            VARCHAR(64),
    last_seen              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at            TIMESTAMP,
    redacted_secrets_count INTEGER DEFAULT 0
);
```

---

### 💻 `REST & WEBSOCKET API // ENDPOINT CHEATSHEET`

```http
# System & Health
GET    /api/health                     --> Health check, DB state, and Gemini engine status
GET    /api/db/status                  --> Query PostgreSQL vs SQLite connection status
GET    /api/stats                      --> Observability stats (MTTR, occurrences, redacted counts)

# Log Processing & Ingestion
POST   /api/upload                     --> Upload & analyze log files (.log, .txt, .csv, .pcap)
POST   /api/logs/stream                --> Ingest live log stream line with auto-detect
WS     /api/ws/logs                    --> WebSocket gateway for real-time terminal streaming

# Registry & Interactive LogSentinel Debugger
GET    /api/reports                    --> Fetch filtered reports (search, category, priority, status)
POST   /api/reports/bulk               --> Bulk save with automated semantic deduplication
PATCH  /api/reports/{id}               --> Update status ('Open', 'Verified', 'Resolved')
DELETE /api/reports/{id}               --> Remove specific bug report
DELETE /api/reports                    --> Clear all bug reports
POST   /api/reports/{id}/chat          --> In-context interactive LogSentinel root-cause debugging

# Multi-Channel Dispatches
POST   /api/reports/{id}/github-issue  --> 1-Click publish to GitHub Issues
POST   /api/reports/{id}/webhook       --> Dispatch to Discord, Slack, Telegram, Jira, or Linear

# Data Export
GET    /api/export/excel               --> Export full bug registry to CSV/Excel
```

---

### 📄 `LICENSE // MIT`

```console
Distributed under the MIT License. See LICENSE for details.
LogSentinel AI Platform © 2026. Built with Python, FastAPI, React, PostgreSQL & Google Gemini.
```
