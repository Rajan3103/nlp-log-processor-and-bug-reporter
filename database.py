import os
import sqlite3
import hashlib
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
POSTGRES_URL = os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL")

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

def generate_fingerprint(description, category, priority):
    """Generates a deterministic hash for deduplicating repeated error signatures."""
    norm_desc = " ".join((description or "").lower().split()[:25])
    norm_cat = (category or "").lower().strip()
    norm_pri = (priority or "").lower().strip()
    raw = f"{norm_desc}|{norm_cat}|{norm_pri}"
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()

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
                github_issue_url TEXT,
                occurrence_count INTEGER DEFAULT 1,
                fingerprint VARCHAR(64),
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                resolved_at TIMESTAMP,
                redacted_secrets_count INTEGER DEFAULT 0
            );
        """)
        # Ensure new columns exist on existing databases
        cursor.execute("""
            SELECT column_name FROM information_schema.columns 
            WHERE table_name='bug_reports';
        """)
        existing_cols = [row[0] if isinstance(row, tuple) else row['column_name'] for row in cursor.fetchall()]
        
        column_defs = {
            'verified': "INTEGER DEFAULT 0",
            'solution': "TEXT",
            'github_issue_url': "TEXT",
            'occurrence_count': "INTEGER DEFAULT 1",
            'fingerprint': "VARCHAR(64)",
            'last_seen': "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
            'resolved_at': "TIMESTAMP",
            'redacted_secrets_count': "INTEGER DEFAULT 0"
        }
        for col, col_type in column_defs.items():
            if col not in existing_cols:
                cursor.execute(f"ALTER TABLE bug_reports ADD COLUMN {col} {col_type};")

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
                github_issue_url TEXT,
                occurrence_count INTEGER DEFAULT 1,
                fingerprint TEXT,
                last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
                resolved_at DATETIME,
                redacted_secrets_count INTEGER DEFAULT 0
            )
        """)
        cursor.execute("PRAGMA table_info(bug_reports)")
        columns = [col[1] for col in cursor.fetchall()]
        column_defs = {
            'verified': "INTEGER DEFAULT 0",
            'solution': "TEXT",
            'github_issue_url': "TEXT",
            'occurrence_count': "INTEGER DEFAULT 1",
            'fingerprint': "TEXT",
            'last_seen': "DATETIME DEFAULT CURRENT_TIMESTAMP",
            'resolved_at': "DATETIME",
            'redacted_secrets_count': "INTEGER DEFAULT 0"
        }
        for col, col_type in column_defs.items():
            if col not in columns:
                cursor.execute(f"ALTER TABLE bug_reports ADD COLUMN {col} {col_type}")
    
    conn.commit()
    conn.close()

def add_report(description, category, priority, source_file, raw_content, status='Open', solution=None, github_issue_url=None, redacted_secrets_count=0, deduplicate=True):
    conn, db_type = get_connection()
    cursor = conn.cursor()
    ph = "%s" if db_type == "postgresql" else "?"
    fingerprint = generate_fingerprint(description, category, priority)
    
    if deduplicate:
        # Check if existing open/in-progress report matches fingerprint
        check_query = f"SELECT id, occurrence_count FROM bug_reports WHERE fingerprint = {ph} AND status != 'Resolved' LIMIT 1"
        cursor.execute(check_query, (fingerprint,))
        row = cursor.fetchone()
        if row:
            existing_id = row[0] if isinstance(row, tuple) else row['id']
            # Update occurrence count and last_seen
            if db_type == "postgresql":
                update_query = f"""
                    UPDATE bug_reports 
                    SET occurrence_count = occurrence_count + 1, 
                        last_seen = CURRENT_TIMESTAMP,
                        redacted_secrets_count = redacted_secrets_count + {ph}
                    WHERE id = {ph}
                """
                cursor.execute(update_query, (redacted_secrets_count, existing_id))
            else:
                update_query = f"""
                    UPDATE bug_reports 
                    SET occurrence_count = occurrence_count + 1, 
                        last_seen = CURRENT_TIMESTAMP,
                        redacted_secrets_count = redacted_secrets_count + {ph}
                    WHERE id = {ph}
                """
                cursor.execute(update_query, (redacted_secrets_count, existing_id))
            conn.commit()
            conn.close()
            return existing_id

    query = f"""
        INSERT INTO bug_reports (description, category, priority, source_file, raw_content, status, solution, github_issue_url, occurrence_count, fingerprint, last_seen, redacted_secrets_count)
        VALUES ({ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, {ph}, 1, {ph}, CURRENT_TIMESTAMP, {ph})
        {"RETURNING id" if db_type == "postgresql" else ""}
    """
    params = (description, category, priority, source_file, raw_content, status, solution, github_issue_url, fingerprint, redacted_secrets_count)
    cursor.execute(query, params)
    
    if db_type == "postgresql":
        report_id = cursor.fetchone()[0]
    else:
        report_id = cursor.lastrowid
        
    conn.commit()
    conn.close()
    return report_id

def add_reports_bulk(reports, deduplicate=True):
    added_count = 0
    updated_duplicates = 0
    for r in reports:
        redacted_count = r.get('redacted_secrets_count', 0)
        report_id = add_report(
            description=r['description'],
            category=r['category'],
            priority=r['priority'],
            source_file=r['source_file'],
            raw_content=r.get('raw_content', ''),
            status=r.get('status', 'Open'),
            solution=r.get('solution', ''),
            github_issue_url=r.get('github_issue_url', None),
            redacted_secrets_count=redacted_count,
            deduplicate=deduplicate
        )
        added_count += 1
    return {"total_processed": added_count}

def get_reports(search=None, category=None, priority=None, status=None):
    conn, db_type = get_connection()
    conditions = []
    params = []
    ph = "%s" if db_type == "postgresql" else "?"

    if search:
        search_pattern = f"%{search}%"
        conditions.append(f"(description LIKE {ph} OR solution LIKE {ph} OR source_file LIKE {ph} OR raw_content LIKE {ph})")
        params.extend([search_pattern, search_pattern, search_pattern, search_pattern])
    
    if category and category != 'All':
        conditions.append(f"category = {ph}")
        params.append(category)

    if priority and priority != 'All':
        conditions.append(f"priority = {ph}")
        params.append(priority)

    if status and status != 'All':
        conditions.append(f"status = {ph}")
        params.append(status)

    where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""
    query = f"SELECT * FROM bug_reports {where_clause} ORDER BY last_seen DESC, timestamp DESC"

    if db_type == "postgresql":
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()
        reports = [dict(r) for r in rows]
        for r in reports:
            if isinstance(r.get('timestamp'), datetime):
                r['timestamp'] = r['timestamp'].isoformat()
            if isinstance(r.get('last_seen'), datetime):
                r['last_seen'] = r['last_seen'].isoformat()
            if isinstance(r.get('resolved_at'), datetime):
                r['resolved_at'] = r['resolved_at'].isoformat()
    else:
        cursor = conn.cursor()
        cursor.execute(query, tuple(params))
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
    
    resolved_clause = f", resolved_at = CURRENT_TIMESTAMP" if status == "Resolved" else ", resolved_at = NULL"
    
    if verified is not None:
        query = f"UPDATE bug_reports SET status = {ph}, verified = {ph} {resolved_clause} WHERE id = {ph}"
        cursor.execute(query, (status, 1 if verified else 0, report_id))
    else:
        query = f"UPDATE bug_reports SET status = {ph} {resolved_clause} WHERE id = {ph}"
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
    
    cursor.execute("SELECT status, COUNT(*) as count FROM bug_reports GROUP BY status")
    status_stats = [{"status": row[0], "count": row[1]} for row in cursor.fetchall()]

    cursor.execute("SELECT COALESCE(SUM(occurrence_count), 0), COALESCE(SUM(redacted_secrets_count), 0), COUNT(*) FROM bug_reports")
    agg_row = cursor.fetchone()
    total_occurrences = agg_row[0] if agg_row else 0
    total_redacted = agg_row[1] if agg_row else 0
    total_unique_bugs = agg_row[2] if agg_row else 0

    # Calculate MTTR (Mean Time to Resolution) for resolved bugs
    mttr_hours = 0.0
    try:
        if db_type == "postgresql":
            cursor.execute("""
                SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - timestamp)) / 3600.0) 
                FROM bug_reports 
                WHERE status = 'Resolved' AND resolved_at IS NOT NULL
            """)
            mttr_val = cursor.fetchone()[0]
            if mttr_val is not None:
                mttr_hours = round(float(mttr_val), 2)
        else:
            cursor.execute("""
                SELECT timestamp, resolved_at FROM bug_reports 
                WHERE status = 'Resolved' AND resolved_at IS NOT NULL
            """)
            rows = cursor.fetchall()
            durations = []
            for r in rows:
                try:
                    t1 = datetime.fromisoformat(r[0])
                    t2 = datetime.fromisoformat(r[1])
                    durations.append((t2 - t1).total_seconds() / 3600.0)
                except:
                    pass
            if durations:
                mttr_hours = round(sum(durations) / len(durations), 2)
    except Exception:
        mttr_hours = 0.0
    
    conn.close()
    return {
        "priorityStats": priority_stats, 
        "categoryStats": category_stats,
        "statusStats": status_stats,
        "totalOccurrences": total_occurrences,
        "totalRedactedSecrets": total_redacted,
        "totalUniqueBugs": total_unique_bugs,
        "mttrHours": mttr_hours
    }

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
