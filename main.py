from fastapi import FastAPI, UploadFile, File, HTTPException, Form, WebSocket, WebSocketDisconnect, Query
from fastapi.responses import Response, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import os
import shutil
import csv
import io
import json
import asyncio
from datetime import datetime

from database import (
    init_db, get_reports, add_report, add_reports_bulk, delete_report, 
    clear_all_reports, update_report_status, get_stats, 
    get_training_data, update_report_github_url, get_db_info
)
from nlp_engine import NLPEngine
from exporter import BugReportExporter
from integrations import (
    create_github_issue, send_discord_webhook, send_slack_webhook,
    send_telegram_alert, create_jira_issue, create_linear_issue
)

app = FastAPI(
    title="Nexus Gemini Log Processor & Bug Identifier",
    description="Live Streaming AI Log Processor, Interactive Gemini Debugger, Deduplication & Enterprise Bug Automation"
)

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database & Gemini NLP Engine
init_db()
engine = NLPEngine()

# WebSocket Connection Manager for Live Log Streaming
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()

# Pydantic Request Models
class ReportUpdate(BaseModel):
    status: str
    verified: Optional[bool] = None

class GitHubIssueRequest(BaseModel):
    github_token: Optional[str] = None
    repo: Optional[str] = None

class WebhookRequest(BaseModel):
    webhook_url: Optional[str] = None
    platform: Optional[str] = "discord" # discord, slack, telegram, jira, linear
    telegram_bot_token: Optional[str] = None
    telegram_chat_id: Optional[str] = None
    jira_url: Optional[str] = None
    jira_email: Optional[str] = None
    jira_token: Optional[str] = None
    jira_project: Optional[str] = None
    linear_api_key: Optional[str] = None
    linear_team_id: Optional[str] = None

class ChatDebugRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, str]]] = []

class StreamLogInput(BaseModel):
    log_line: str
    source: Optional[str] = "live_stream"
    auto_analyze: Optional[bool] = True

@app.get("/")
async def root():
    return {
        "system": "Nexus Gemini Log Processor & Bug Reporter",
        "status": "online",
        "engine": "Google Gemini 1.5 Flash",
        "has_gemini": engine.has_gemini
    }

@app.get("/api/health")
async def health():
    db_info = get_db_info()
    return {
        "status": "online", 
        "engine": "Gemini 1.5 Flash" if engine.has_gemini else "offline",
        "has_gemini": engine.has_gemini,
        "database": db_info["engine"],
        "is_postgresql": db_info["is_postgresql"]
    }

@app.get("/api/db/status")
async def db_status():
    return get_db_info()

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...), engine_type: str = Form("auto")):
    temp_path = f"uploads/{file.filename}"
    os.makedirs("uploads", exist_ok=True)
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    try:
        with open(temp_path, "rb") as f:
            content_bytes = f.read()
        
        raw_text = engine.process_file_content(content_bytes, file.filename)
        sanitized_content, redacted_count = engine.preprocess_and_sanitize(raw_text)
        reports = engine.analyze(raw_text, file.filename, engine=engine_type)
        
        # Cleanup
        if os.path.exists(temp_path):
            os.remove(temp_path)
        
        return {
            "message": "File processed successfully with Gemini AI",
            "fileName": file.filename,
            "content": sanitized_content[:5000],
            "redactedSecretsCount": redacted_count,
            "reports": reports
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports")
async def list_reports(
    search: Optional[str] = None,
    category: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None
):
    return get_reports(search=search, category=category, priority=priority, status=status)

@app.post("/api/reports/bulk")
async def save_reports(data: List[dict]):
    res = add_reports_bulk(data, deduplicate=True)
    return {"success": True, "count": len(data), "details": res}

@app.patch("/api/reports/{report_id}")
async def update_report(report_id: int, update: ReportUpdate):
    update_report_status(report_id, update.status, update.verified)
    return {"success": True}

@app.post("/api/reports/{report_id}/chat")
async def chat_with_gemini_on_report(report_id: int, req: ChatDebugRequest):
    reports = get_reports()
    report = next((r for r in reports if r['id'] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Bug report not found")
    
    response_text = engine.chat_debug(report, req.history or [], req.message)
    return {
        "success": True,
        "reply": response_text,
        "timestamp": datetime.now().isoformat()
    }

@app.post("/api/reports/{report_id}/github-issue")
async def publish_github_issue(report_id: int, request: GitHubIssueRequest):
    reports = get_reports()
    report = next((r for r in reports if r['id'] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    try:
        res = create_github_issue(
            report=report, 
            token=request.github_token, 
            repo=request.repo
        )
        issue_url = res["issue_url"]
        update_report_github_url(report_id, issue_url)
        return {
            "success": True,
            "issue_url": issue_url,
            "issue_number": res["issue_number"]
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/reports/{report_id}/webhook")
async def trigger_webhook(report_id: int, request: WebhookRequest):
    reports = get_reports()
    report = next((r for r in reports if r['id'] == report_id), None)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    try:
        platform = (request.platform or "discord").lower()
        if platform == "slack":
            res = send_slack_webhook(report, request.webhook_url)
        elif platform == "telegram":
            res = send_telegram_alert(report, request.telegram_bot_token, request.telegram_chat_id)
        elif platform == "jira":
            res = create_jira_issue(report, request.jira_url, request.jira_email, request.jira_token, request.jira_project)
            return {"success": True, "platform": "jira", "issue_url": res.get("issue_url")}
        elif platform == "linear":
            res = create_linear_issue(report, request.linear_api_key, request.linear_team_id)
            return {"success": True, "platform": "linear", "issue_url": res.get("issue_url")}
        else:
            res = send_discord_webhook(report, request.webhook_url)
            
        return {"success": True, "platform": platform}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/reports/{report_id}")
async def remove_report(report_id: int):
    delete_report(report_id)
    return {"success": True}

@app.delete("/api/reports")
async def remove_all_reports():
    clear_all_reports()
    return {"success": True}

@app.get("/api/stats")
async def stats():
    return get_stats()

# Live Ingestion & WebSocket Streaming Endpoints
@app.post("/api/logs/stream")
async def ingest_log_line(input_data: StreamLogInput):
    """
    Ingests live logs from daemon forwarders, scrubs secrets, broadcasts over WebSocket,
    and automatically triggers Gemini analysis if error or exception markers are present.
    """
    sanitized_line, redacted_count = engine.preprocess_and_sanitize(input_data.log_line)
    
    payload = {
        "timestamp": datetime.now().isoformat(),
        "source": input_data.source,
        "line": sanitized_line,
        "redacted_count": redacted_count
    }
    
    # Broadcast to live UI WebSocket listeners
    await manager.broadcast({"type": "LOG_LINE", "data": payload})
    
    analyzed_report = None
    # If severe error pattern detected and auto_analyze enabled, parse with Gemini
    error_patterns = ["error", "exception", "fatal", "traceback", "critical", "panic", "unhandled"]
    if input_data.auto_analyze and any(pat in input_data.log_line.lower() for pat in error_patterns):
        try:
            reports = engine.analyze(input_data.log_line, input_data.source)
            if reports:
                add_reports_bulk(reports, deduplicate=True)
                analyzed_report = reports[0]
                await manager.broadcast({"type": "NEW_BUG_DETECTED", "report": analyzed_report})
        except Exception as e:
            print(f"[Streaming Ingestion] Auto-analyze note: {e}")

    return {
        "status": "received", 
        "redacted_secrets": redacted_count,
        "bug_detected": analyzed_report is not None
    }

@app.websocket("/api/ws/logs")
async def websocket_logs_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({
            "type": "CONNECTION_ESTABLISHED",
            "message": "Connected to Nexus Gemini Live Stream Gateway",
            "time": datetime.now().isoformat()
        })
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
                elif msg.get("type") == "STREAM_LINE":
                    line = msg.get("line", "")
                    sanitized, count = engine.preprocess_and_sanitize(line)
                    await manager.broadcast({
                        "type": "LOG_LINE",
                        "data": {
                            "timestamp": datetime.now().isoformat(),
                            "source": "terminal_client",
                            "line": sanitized,
                            "redacted_count": count
                        }
                    })
            except Exception:
                pass
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception:
        manager.disconnect(websocket)

@app.get("/api/export/excel")
async def export_excel():
    reports = get_reports()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Priority", "Category", "Occurrences", "Issue Description", "Source File", "Timestamp", "Last Seen", "Solution", "Verified", "GitHub Issue"])
    
    for r in reports:
        writer.writerow([
            r['id'], 
            r['priority'], 
            r['category'],
            r.get('occurrence_count', 1),
            r['description'], 
            r['source_file'], 
            r['timestamp'],
            r.get('last_seen', ''),
            r.get('solution', ''),
            'Yes' if r.get('verified') else 'No',
            r.get('github_issue_url', '')
        ])
    
    return Response(
        content=output.getvalue(), 
        media_type="text/csv", 
        headers={"Content-Disposition": 'attachment; filename="registry_export.csv"'}
    )

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
