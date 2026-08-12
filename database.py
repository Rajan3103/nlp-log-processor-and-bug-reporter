import os
import sqlite3
from datetime import datetime
from dotenv import load_dotenv

load_dotenv(".env.local")

# Configuration
SQLITE_DB_PATH = "logs.db"

# PostgreSQL env parameters
PGHOST = os.getenv("PGHOST")
PGPORT = os.getenv("PGPORT", "5432")
PGUSER = os.getenv("PGUSER")
PGPASSWORD = os.getenv("PGPASSWORD")
PGDATABASE = os.getenv("PGDATABASE")
POSTGRES_URL = os.getenv("POSTGRES_URL")

HAS_POSTGRES = False
psycopg2 = None

try:
    import psycopg2
    from psycopg2.extras import RealDictCursor
    HAS_POSTGRES = True
except ImportError:
    HAS_POSTGRES = False

def is_postgres_configured():
    if not HAS_POSTGRES:
        return False
    if POSTGRES_URL or (PGUSER and PGPASSWORD and PGDATABASE):
        return True
    return False

def get_connection():
    """Establishes connection to PostgreSQL if configured, otherwise falls back to SQLite."""
    if is_postgres_configured():
        try:
            if POSTGRES_URL:
                conn = psycopg2.connect(POSTGRES_URL)
            else:
                try:
                    conn = psycopg2.connect(
                        host=PGHOST or "localhost",
                        port=PGPORT or "5432",
                        user=PGUSER,
                        password=PGPASSWORD,
                        dbname=PGDATABASE
                    )
                except Exception as db_err:
                    err_str = str(db_err).lower()
                    if "does not exist" in err_str or "database" in err_str:
                        # Auto-create target database on PostgreSQL server
                        print(f"[Database] Target DB '{PGDATABASE}' does not exist. Creating it on PostgreSQL server...")
                        admin_conn = psycopg2.connect(
                            host=PGHOST or "localhost",
                            port=PGPORT or "5432",
                            user=PGUSER,
                            password=PGPASSWORD,
                            dbname="postgres"
                        )
                        admin_conn.autocommit = True
                        admin_cursor = admin_conn.cursor()
                        admin_cursor.execute(f'CREATE DATABASE "{PGDATABASE}";')
                        admin_cursor.close()
                        admin_conn.close()
                        
                        # Reconnect to newly created database
                        conn = psycopg2.connect(
                            host=PGHOST or "localhost",
                            port=PGPORT or "5432",
                            user=PGUSER,
                            password=PGPASSWORD,
                            dbname=PGDATABASE
                        )
                    else:
                        raise db_err

            return conn, "postgresql"
        except Exception as e:
            print(f"[Database] PostgreSQL connection attempt error: {e}. Falling back to SQLite.")
            pass
    
    conn = sqlite3.connect(SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn, "sqlite"

def init_db():
    conn, db_type = get_connection()
    cursor = conn.cursor()

    if db_type == "postgresql":
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bug_reports (
                id SERIAL PRIMARY KEY,
                description TEXT,
                category VARCHAR(100),
                priority VARCHAR(50),
                source_file VARCHAR(255),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                raw_content TEXT,
                status VARCHAR(50) DEFAULT 'Open',
                verified INTEGER DEFAULT 0,
                solution TEXT,
                github_issue_url TEXT
            );
        """)
        # Check missing columns in postgres
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='bug_reports';
        """)
        existing_cols = [row[0] if isinstance(row, tuple) else row['column_name'] for row in cursor.fetchall()]
        if 'verified' not in existing_cols:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN verified INTEGER DEFAULT 0;")
        if 'solution' not in existing_cols:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN solution TEXT;")
        if 'github_issue_url' not in existing_cols:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN github_issue_url TEXT;")
    else:
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
                verified INTEGER DEFAULT 0,
                solution TEXT,
                github_issue_url TEXT
            )
        """)
        cursor.execute("PRAGMA table_info(bug_reports)")
        columns = [col[1] for col in cursor.fetchall()]
        if 'verified' not in columns:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN verified INTEGER DEFAULT 0")
        if 'solution' not in columns:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN solution TEXT")
        if 'github_issue_url' not in columns:
            cursor.execute("ALTER TABLE bug_reports ADD COLUMN github_issue_url TEXT")
    
    conn.commit()
    conn.close()

def add_report(description, category, priority, source_file, raw_content, status='Open', solution=None, github_issue_url=None):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    
    query = f"""
        INSERT INTO bug_reports (description, category, priority, source_file, raw_content, status, solution, github_issue_url)
        VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
        {"RETURNING id" if db_type == "postgresql" else ""}
    """
    params = (description, category, priority, source_file, raw_content, status, solution, github_issue_url)
    cursor.execute(query, params)
    
    if db_type == "postgresql":
        report_id = cursor.fetchone()[0]
    else:
        report_id = cursor.lastrowid
        
    conn.commit()
    conn.close()
    return report_id

def add_reports_bulk(reports):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    
    query = f"""
        INSERT INTO bug_reports (description, category, priority, source_file, raw_content, status, solution, github_issue_url)
        VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph})
    """
    param_list = [
        (r['description'], r['category'], r['priority'], r['source_file'], r.get('raw_content', ''), r.get('status', 'Open'), r.get('solution', ''), r.get('github_issue_url', None)) 
        for r in reports
    ]
    cursor.executemany(query, param_list)
    conn.commit()
    conn.close()

def get_reports():
    conn, db_type = get_connection()
    if db_type == "postgresql":
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT * FROM bug_reports ORDER BY timestamp DESC")
        rows = cursor.fetchall()
        reports = [dict(r) for r in rows]
        for r in reports:
            if isinstance(r.get('timestamp'), datetime):
                r['timestamp'] = r['timestamp'].isoformat()
    else:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bug_reports ORDER BY timestamp DESC")
        reports = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return reports

def delete_report(report_id):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    cursor.execute(f"DELETE FROM bug_reports WHERE id = {ph}", (report_id,))
    conn.commit()
    conn.close()

def clear_all_reports():
    conn, db_type = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM bug_reports")
    conn.commit()
    conn.close()

def update_report_status(report_id, status, verified=None):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    
    if verified is not None:
        query = f"UPDATE bug_reports SET status = {ph}, verified = {ph} WHERE id = {ph}"
        cursor.execute(query, (status, 1 if verified else 0, report_id))
    else:
        query = f"UPDATE bug_reports SET status = {ph} WHERE id = {ph}"
        cursor.execute(query, (status, report_id))
        
    conn.commit()
    conn.close()

def update_report_github_url(report_id, github_url):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    cursor.execute(f"UPDATE bug_reports SET github_issue_url = {ph} WHERE id = {ph}", (github_url, report_id))
    conn.commit()
    conn.close()

def get_stats():
    conn, db_type = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT priority, COUNT(*) as count FROM bug_reports GROUP BY priority")
    priority_stats = [{"priority": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    cursor.execute("SELECT category, COUNT(*) as count FROM bug_reports GROUP BY category")
    category_stats = [{"category": row[0], "count": row[1]} for row in cursor.fetchall()]
    
    conn.close()
    return {"priorityStats": priority_stats, "categoryStats": category_stats}

def get_training_data():
    conn, db_type = get_connection()
    if db_type == "postgresql":
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute("SELECT description, category, priority FROM bug_reports WHERE verified = 1")
        data = [dict(row) for row in cursor.fetchall()]
    else:
        cursor = conn.cursor()
        cursor.execute("SELECT description, category, priority FROM bug_reports WHERE verified = 1")
        data = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return data

def get_db_info():
    conn, db_type = get_connection()
    conn.close()
    return {
        "engine": db_type,
        "is_postgresql": db_type == "postgresql",
        "has_psycopg2": HAS_POSTGRES
    }

if __name__ == "__main__":
    init_db()
    info = get_db_info()
    print(f"Database initialized using engine: {info['engine']}")
