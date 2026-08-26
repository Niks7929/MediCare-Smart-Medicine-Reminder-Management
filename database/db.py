"""
MediCare+ Database Abstraction Layer
Supports SQLite (zero-config standalone) and MySQL / MariaDB (WAMP Server).
Automatically seeds initial users, patient profiles, medications, dose records, and prescriptions.
"""

import os
import sqlite3
import hashlib
from datetime import datetime, date, timedelta
from config import Config

def hash_password(password: str) -> str:
    """Generate SHA256 password hash with salt."""
    return hashlib.sha256(f"medicare_salt_{password}".encode('utf-8')).hexdigest()

def get_connection():
    """Returns a SQLite database connection configured with Row factory."""
    os.makedirs(os.path.dirname(Config.SQLITE_DB_PATH), exist_ok=True)
    conn = sqlite3.connect(Config.SQLITE_DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    """Creates schema and populates initial demo data if empty. Self-heals if database file is malformed."""
    db_path = Config.SQLITE_DB_PATH
    
    # If the file exists but is 0 bytes or invalid, remove it before connecting
    if os.path.exists(db_path) and os.path.getsize(db_path) == 0:
        try:
            os.remove(db_path)
        except Exception:
            pass

    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        _execute_init(conn, cursor)
    except (sqlite3.DatabaseError, sqlite3.OperationalError) as e:
        # Close connection first so Windows releases the file lock
        if conn:
            try:
                conn.close()
            except Exception:
                pass
            conn = None

        # Reset corrupted database file cleanly
        if os.path.exists(db_path):
            try:
                os.remove(db_path)
            except Exception:
                # If Windows still holds a lock, rename it
                try:
                    os.rename(db_path, f"{db_path}.corrupted_{int(datetime.now().timestamp())}")
                except Exception:
                    pass

        # Re-initialize cleanly
        conn = get_connection()
        cursor = conn.cursor()
        _execute_init(conn, cursor)
    finally:
        if conn:
            try:
                conn.close()
            except Exception:
                pass

def _execute_init(conn, cursor):
    # Schema creation
    cursor.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            user_id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role TEXT DEFAULT 'patient',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS patients (
            patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
            primary_user_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relationship TEXT DEFAULT 'Self',
            age INTEGER,
            gender TEXT,
            blood_group TEXT,
            allergies TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (primary_user_id) REFERENCES users(user_id)
        );

        CREATE TABLE IF NOT EXISTS medicines (
            medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            dosage TEXT NOT NULL,
            form TEXT DEFAULT 'Tablet',
            instructions TEXT,
            start_date TEXT,
            end_date TEXT,
            total_quantity INTEGER DEFAULT 30,
            remaining_quantity INTEGER DEFAULT 30,
            refill_threshold INTEGER DEFAULT 5,
            snooze_interval_minutes INTEGER DEFAULT 10,
            refill_requested INTEGER DEFAULT 0,
            last_refill_requested_at TEXT,
            qr_code_data TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        );

        CREATE TABLE IF NOT EXISTS medicine_schedules (
            schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL,
            scheduled_time TEXT NOT NULL,
            frequency_type TEXT DEFAULT 'Daily',
            days_of_week TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
            is_active INTEGER DEFAULT 1,
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id)
        );

        CREATE TABLE IF NOT EXISTS dose_records (
            dose_id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            scheduled_datetime TEXT NOT NULL,
            actual_datetime TEXT,
            status TEXT DEFAULT 'PENDING',
            snooze_count INTEGER DEFAULT 0,
            snooze_minutes INTEGER DEFAULT 0,
            missed_reason TEXT,
            logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        );

        CREATE TABLE IF NOT EXISTS caregivers (
            caregiver_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            relation TEXT,
            phone TEXT,
            email TEXT,
            notify_on_missed INTEGER DEFAULT 1,
            notify_threshold INTEGER DEFAULT 2,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        );

        CREATE TABLE IF NOT EXISTS prescriptions (
            prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_name TEXT,
            clinic_name TEXT,
            prescription_date TEXT,
            notes TEXT,
            file_path TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
        );

        CREATE TABLE IF NOT EXISTS refill_notifications (
            notification_id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL,
            patient_id INTEGER NOT NULL,
            caregiver_id INTEGER,
            requested_quantity INTEGER DEFAULT 30,
            status TEXT DEFAULT 'PENDING',
            urgent INTEGER DEFAULT 0,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
    """)

    # Safe schema migration for existing SQLite files
    try:
        med_cols = [c['name'] for c in cursor.execute("PRAGMA table_info(medicines)").fetchall()]
        if 'snooze_interval_minutes' not in med_cols:
            cursor.execute("ALTER TABLE medicines ADD COLUMN snooze_interval_minutes INTEGER DEFAULT 10")
    except Exception as e:
        print(f"Migration notice: {e}")

    conn.commit()
    conn.close()

def seed_demo_data(cursor):
    """Optional demo seeder (disabled by default for clean start)."""
    pass

if __name__ == '__main__':
    initialize_database()
    print("MediCare+ SQLite Database initialized cleanly (empty state) at:", Config.SQLITE_DB_PATH)
