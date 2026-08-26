-- ========================================================
-- MediCare+ — Smart Medication Management System Database
-- Target Engine: SQLite (Works automatically with python app.py)
-- ========================================================

PRAGMA foreign_keys = ON;

-- 1. Users Table (Authentication & Multi-Role)
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'patient', -- 'patient', 'doctor', 'caregiver'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Patients Table (Supports Multi-Patient Profiles under 1 User)
CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT DEFAULT 'Self', -- 'Self', 'Parent', 'Spouse', 'Child'
    age INTEGER,
    gender TEXT,
    blood_group TEXT,
    allergies TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- 3. Caregivers Table (Emergency Contacts & Missed Dose Notifications)
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
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 4. Medicines Table (Inventory, Dosage & Smart Snooze)
CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL, -- e.g. '500mg', '1 tablet'
    form TEXT DEFAULT 'Tablet', -- 'Tablet', 'Capsule', 'Syrup', 'Injection'
    instructions TEXT, -- 'Take after meal'
    start_date TEXT NOT NULL,
    end_date TEXT,
    total_quantity INTEGER DEFAULT 30,
    remaining_quantity INTEGER DEFAULT 30,
    refill_threshold INTEGER DEFAULT 5,
    snooze_interval_minutes INTEGER DEFAULT 10,
    refill_requested INTEGER DEFAULT 0,
    last_refill_requested_at TEXT,
    qr_code_data TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 5. Medicine Schedules Table (Time Alarms & Frequency)
CREATE TABLE IF NOT EXISTS medicine_schedules (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    scheduled_time TEXT NOT NULL, -- e.g. '08:00:00'
    frequency_type TEXT DEFAULT 'Daily',
    days_of_week TEXT DEFAULT 'Mon,Tue,Wed,Thu,Fri,Sat,Sun',
    is_active INTEGER DEFAULT 1,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

-- 6. Dose Records Table (Logs Compliance, Missed & Snoozed history)
CREATE TABLE IF NOT EXISTS dose_records (
    dose_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    scheduled_datetime TEXT NOT NULL,
    actual_datetime TEXT,
    status TEXT DEFAULT 'PENDING', -- 'TAKEN', 'MISSED', 'SKIPPED', 'TAKEN_LATE', 'PENDING'
    snooze_count INTEGER DEFAULT 0,
    snooze_minutes INTEGER DEFAULT 0,
    missed_reason TEXT,
    logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 7. Prescriptions Table (Doctor Vault & Rx Uploads)
CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_name TEXT,
    prescription_date TEXT,
    notes TEXT,
    file_path TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id) ON DELETE CASCADE
);

-- 8. Audit & Security Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
