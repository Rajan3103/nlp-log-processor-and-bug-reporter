```
 ╔═════════════════════════════════════════════════════════════════════════════════════════╗
 ║  ┌──(nexus-nlp㉿root)-[~/bug-identifier]                                                 ║
 ║  └─$ ./launch_system.sh --mode POSTGRESQL --ai GEMINI-1.5 --version 2.5.0-STABLE        ║
 ║                                                                                         ║
 ║   ██████╗ ██╗   ██╗ ██████╗     ██╗██████╗ ███████╗███╗   ██╗████████╗██╗███████╗██╗███████╗██████╗ ║
 ║   ██╔══██╗██║   ██║██╔════╝     ██║██╔══██╗██╔════╝████╗  ██║╚══██╔══╝██║██╔════╝██║██╔════╝██╔══██╗║
 ║   ██████╔╝██║   ██║██║  ███╗    ██║██║  ██║█████╗  ██╔██╗ ██║   ██║   ██║█████╗  ██║█████╗  ██████╔╝║
 ║   ██╔══██╗██║   ██║██║   ██║    ██║██║  ██║██╔══╝  ██║╚██╗██║   ██║   ██║██╔══╝  ██║██╔══╝  ██╔══██╗║
 ║   ██████╔╝╚██████╔╝╚██████╔╝    ██║██████╔╝███████╗██║ ╚████║   ██║   ██║██║     ██║███████╗██║  ██║║
 ║   ╚═════╝  ╚═════╝  ╚═════╝     ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═══╝   ╚═╝   ╚═╝╚═╝     ╚═╝╚══════╝╚═╝  ╚═╝║
 ║                                                                                         ║
 ║   [SYSTEM INITIALIZED]: AI Vector Log Processor & Multi-Channel Bug Automation Platform ║
 ╚═════════════════════════════════════════════════════════════════════════════════════════╝
```

<div align="center">

[![FastAPI](https://img.shields.io/badge/⚡_Backend-FastAPI_0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/⚛️_Frontend-React_18_Vite-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/🐘_Database-PostgreSQL_pgAdmin4-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini](https://img.shields.io/badge/🧠_AI-Gemini_1.5_Flash-4285F4?style=for-the-badge&logo=google-gemini&logoColor=white)](https://ai.google.dev/)
[![GitHub API](https://img.shields.io/badge/🐙_Integration-GitHub_REST-181717?style=for-the-badge&logo=github&logoColor=white)](https://docs.github.com/en/rest)

</div>

---

### 🖥️ `SYS_DIAGNOSTICS // SYSTEM STATUS`

```console
[root@nexus-node-01 ~]# systemctl status nexus-pipeline.service
● nexus-pipeline.service - AI Log Ingestion & Bug Automated Reporting Engine
     Loaded: loaded (/etc/systemd/system/nexus-pipeline.service; enabled)
     Active: active (running) since Wed 2026-08-12 10:30:00 UTC; 5ms ago
   Main PID: 8000 (uvicorn-fastapi)
      Tasks: 16 (limit: 4915)
     Memory: 142.5M
        CPU: 120ms
     CGroup: /system.slice/nexus-pipeline.service
             ├─ 8000 /usr/bin/python3 main.py --host 0.0.0.0 --port 8000
             └─ 5173 node /client/node_modules/.bin/vite --host

[LOG_STREAM] Initializing PostgreSQL database 'NLP_log'... CONNECTED.
[LOG_STREAM] Loading Gemini 1.5 Flash AI Engine... READY.
[LOG_STREAM] GitHub REST & Webhook Dispatches... ONLINE.
```

---

### ⚡ `CAPABILITIES // CORE MODULES`

```bash
$ nexus-cli --list-modules

  [MOD-01] 🧠 HYBRID AI VECTOR ENGINE
           └─ Processes .log, .pcap, .csv, .txt files via Gemini 1.5 Flash, Groq, or local Ollama.
           └─ Fallback ML: Scikit-Learn Random Forest Classifier trained on verified log vectors.

  [MOD-02] 🐘 POSTGRESQL & SQLITE DUAL ENGINE
           └─ Primary: Enterprise PostgreSQL database (pgAdmin 4 integration & auto DB creation).
           └─ Fallback: Zero-config local SQLite database (logs.db) with seamless connection routing.

  [MOD-03] 🐙 1-CLICK GITHUB ISSUE PUBLISHER
           └─ Converts AI bug reports into formatted markdown GitHub issues with tracebacks & fix patches.
           └─ Auto-applies tags: `bug`, `priority:critical`, `category:security-alert`.

  [MOD-04] 🔔 MULTI-CHANNEL WEBHOOK ALERTS
           └─ Discord: Sends rich color-coded priority embeds.
           └─ Slack: Sends structured Block Kit alert cards.

  [MOD-05] 🛡️ SENSITIVE DATA REDACTION PIPELINE
           └─ Automatic regex scrubbing of timestamps, IP addresses, memory hex addrs, and secret keys.
```

---

### 📁 `DIRECTORY_TREE // REPOSITORY MAP`

```console
nexus-nlp-pipeline/
├── 📄 main.py               # FastAPI Core REST API Gateway & Server entry point
├── 📄 database.py           # Dual PostgreSQL (psycopg2) & SQLite DB ORM Engine
├── 📄 nlp_engine.py         # Multi-LLM Vector Classifier (Gemini / Groq / Ollama / Sklearn)
├── 📄 integrations.py       # [NEW] GitHub REST API & Webhook Notification Engine
├── 📄 exporter.py           # Audit report exporter (Excel/CSV/PDF)
├── 📄 .env.local            # Environment configuration (PostgreSQL, AI Keys, Webhooks)
├── 📄 requirements.txt      # Python backend dependencies
└── 📁 client/               # React + TypeScript + Vite + Tailwind Frontend
    ├── 📄 package.json      # Node dependencies
    ├── 📁 public/           # Static assets & icons
    └── 📁 src/
        ├── 📄 App.tsx       # Main Cyberpunk Terminal Dashboard UI
        ├── 📄 App.css       # Custom glassmorphism & mesh background styles
        └── 📄 index.css     # Tailwind CSS base system
```

---

### 🚀 `QUICKSTART // RUNNING THE PIPELINE`

#### 1️⃣ Clone & Configure Environment
```bash
$ git clone https://github.com/Rajan3103/nlp-log-processor-and-bug-reporter.git
$ cd nlp-log-processor-and-bug-reporter

$ cat << 'EOF' > .env.local
# AI Model Credentials
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here

# PostgreSQL Database Configuration (pgAdmin 4)
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=root123
PGDATABASE=NLP_log

# Optional Integration Credentials
GITHUB_TOKEN=ghp_your_personal_access_token
GITHUB_REPO=username/repository
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
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
#  VITE v5.0.0  ready in 320 ms
#  ➜  Local:   http://localhost:5173/
#  ➜  Network: use --host to expose
```

---

### 📊 `DB_SCHEMA // POSTGRESQL DATA MODEL`

```sql
-- Table: public.bug_reports
CREATE TABLE bug_reports (
    id               SERIAL PRIMARY KEY,
    description      TEXT NOT NULL,
    category         VARCHAR(100) NOT NULL,
    priority         VARCHAR(50) NOT NULL,
    source_file      VARCHAR(255) NOT NULL,
    timestamp        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_content      TEXT,
    status           VARCHAR(50) DEFAULT 'Open',
    verified         INTEGER DEFAULT 0,
    solution         TEXT,
    github_issue_url TEXT
);
```

---

### 💻 `REST_API // ENDPOINT CHEATSHEET`

```http
GET    /api/health                   --> Health check & active DB/AI engine status
GET    /api/db/status                --> Query PostgreSQL vs SQLite state
POST   /api/upload                   --> Ingest log file (.log, .txt, .csv, .pcap)
GET    /api/reports                  --> Fetch all parsed bug records
POST   /api/reports/{id}/github-issue--> 1-Click publish report to GitHub Issues
POST   /api/reports/{id}/webhook     --> Dispatch Discord/Slack webhook notification
DELETE /api/reports/{id}             --> Delete report from database
GET    /api/export/excel             --> Export registry to CSV/Excel report
```

---

### 📄 `LICENSE // MIT`

```console
Distributed under the MIT License. See LICENSE for details.
Nexus NLP Pipeline © 2026. Built with Python, FastAPI, React, PostgreSQL & Gemini.
```
