from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import os
import shutil
from database import init_db, get_reports, add_reports_bulk, delete_report, clear_all_reports, update_report_status, get_stats, get_training_data
from nlp_engine import NLPEngine
from exporter import BugReportExporter

app = FastAPI()

# Enable CORS for React development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize
init_db()
engine = NLPEngine()

class ReportUpdate(BaseModel):
    status: str
    verified: Optional[bool] = None

class BulkReports(BaseModel):
    reports: List[dict]

@app.get("/api/health")
async def health():
    return {"status": "online", "engine": "ready" if engine.has_gemini else "offline"}

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

@app.post("/api/train")
async def train():
    data = get_training_data()
    success, msg = engine.train_local_model(data)
    if not success:
        raise HTTPException(status_code=400, detail=msg)
    return {"message": msg}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
