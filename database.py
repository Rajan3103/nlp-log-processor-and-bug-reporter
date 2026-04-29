import sqlite3
import os
from datetime import datetime

DB_PATH = "logs.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS bug_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT,
            category TEXT,
            priority TEXT,
            source_file TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            raw_content TEXT,
            status TEXT DEFAULT 'Open',
            verified INTEGER DEFAULT 0
        )
    """)
    # Check for verified column (migration)
    cursor.execute("PRAGMA table_info(bug_reports)")
    columns = [col[1] for col in cursor.fetchall()]
    if 'verified' not in columns:
        cursor.execute("ALTER TABLE bug_reports ADD COLUMN verified INTEGER DEFAULT 0")
    
    conn.commit()
    conn.close()

def add_report(description, category, priority, source_file, raw_content, status='Open'):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO bug_reports (description, category, priority, source_file, raw_content, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (description, category, priority, source_file, raw_content, status))
    report_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return report_id

def add_reports_bulk(reports):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.executemany("""
        INSERT INTO bug_reports (description, category, priority, source_file, raw_content, status)
        VALUES (?, ?, ?, ?, ?, ?)
    """, [(r['description'], r['category'], r['priority'], r['source_file'], r.get('raw_content', ''), r.get('status', 'Open')) for r in reports])
    conn.commit()
    conn.close()

def get_reports():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM bug_reports ORDER BY timestamp DESC")
    reports = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reports

def delete_report(report_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bug_reports WHERE id = ?", (report_id,))
    conn.commit()
    conn.close()

def clear_all_reports():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bug_reports")
    conn.commit()
    conn.close()

def update_report_status(report_id, status, verified=None):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    if verified is not None:
        cursor.execute("UPDATE bug_reports SET status = ?, verified = ? WHERE id = ?", (status, 1 if verified else 0, report_id))
    else:
        cursor.execute("UPDATE bug_reports SET status = ? WHERE id = ?", (status, report_id))
    conn.commit()
    conn.close()

def get_stats():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("SELECT priority, COUNT(*) as count FROM bug_reports GROUP BY priority")
    priority_stats = [{"priority": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    cursor.execute("SELECT category, COUNT(*) as count FROM bug_reports GROUP BY category")
    category_stats = [{"category": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    conn.close()
    return {"priorityStats": priority_stats, "categoryStats": category_stats}

def get_training_data():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    cursor.execute("SELECT description, category, priority FROM bug_reports WHERE verified = 1")
    data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return data

if __name__ == "__main__":
    init_db()
    print("Database initialized.")
