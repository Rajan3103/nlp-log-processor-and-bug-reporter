from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.responses import Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
import csv
import io
from database import (
    init_db, get_reports, add_reports_bulk, delete_report, 
    clear_all_reports, update_report_status, get_stats, 
    get_training_data, update_report_github_url, get_db_info
)
from nlp_engine import NLPEngine
from exporter import BugReportExporter
from integrations import create_github_issue, send_discord_webhook, send_slack_webhook

app = FastAPI(title="Bug Identifier API", description="AI Log Processor, Bug Reporter & PostgreSQL Integration")

# Enable CORS for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Database & Engine
init_db()
engine = NLPEngine()

class ReportUpdate(BaseModel):
    status: str
    verified: Optional[bool] = None

class GitHubIssueRequest(BaseModel):
    github_token: Optional[str] = None
    repo: Optional[str] = None

class WebhookRequest(BaseModel):
    webhook_url: Optional[str] = None
    platform: Optional[str] = "discord" # "discord" or "slack"

@app.get("/api/health")
async def health():
    db_info = get_db_info()
    return {
        "status": "online", 
        "engine": "ready" if engine.has_gemini else "offline",
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
        
        content = engine.process_file_content(content_bytes, file.filename)
        reports = engine.analyze(content, file.filename, engine=engine_type)
        
        # Cleanup
        os.remove(temp_path)
        
        return {
            "message": "File processed successfully",
            "fileName": file.filename,
            "content": content[:5000], # Preview
            "reports": reports
        }
    except Exception as e:
        if os.path.exists(temp_path):
            os.remove(temp_path)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/reports")
async def list_reports():
    return get_reports()

@app.post("/api/reports/bulk")
async def save_reports(data: List[dict]):
    add_reports_bulk(data)
    return {"success": True, "count": len(data)}

@app.patch("/api/reports/{report_id}")
async def update_report(report_id: int, update: ReportUpdate):
    update_report_status(report_id, update.status, update.verified)
    return {"success": True}

@app.post("/api/reports/{report_id}/github-issue")
async def publish_github_issue(report_id: int, request: GitHubIssueRequest):
    reports = get_reports()
    report = next((r for r in reports if r['id'] == report_id), None)
    if not report:
        raise HTTPException(status_code=444, detail="Report not found")
        
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
        if request.platform == "slack":
            res = send_slack_webhook(report, request.webhook_url)
        else:
            res = send_discord_webhook(report, request.webhook_url)
        return {"success": True, "platform": request.platform}
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

@app.get("/api/export/excel")
async def export_excel():
    reports = get_reports()
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Priority", "Category", "Issue Description", "Source File", "Timestamp", "Solution", "Verified", "GitHub Issue"])
    
    for r in reports:
        writer.writerow([
            r['id'], 
            r['priority'], 
            r['category'], 
            r['description'], 
            r['source_file'], 
            r['timestamp'], 
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
    uvicorn.run(app, host="0.0.0.0", port=8000)
