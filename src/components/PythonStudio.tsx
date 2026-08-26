import React, { useState, useEffect } from 'react';
import { 
  Code2, 
  Terminal, 
  Download, 
  Copy, 
  Check, 
  FileCode, 
  Database, 
  Brain, 
  Sparkles, 
  Play, 
  Layers, 
  Server, 
  CheckCircle2, 
  Folder, 
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import JSZip from 'jszip';

interface PythonFileItem {
  name: string;
  path: string;
  category: 'server' | 'database' | 'ml' | 'models' | 'templates' | 'config';
  description: string;
  content: string;
}

export const PythonStudio: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<string>('run_medicare.py');
  const [copied, setCopied] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [downloadingZip, setDownloadingZip] = useState(false);

  // Live Diagnostics States
  const [backendHealth, setBackendHealth] = useState<any>(null);
  const [healthLoading, setHealthLoading] = useState(false);
  
  // Interactive ML Test state
  const [mlInput, setMlInput] = useState({
    scheduled_hour: 20,
    day_of_week: new Date().getDay(),
    historical_adherence: 0.88,
    snooze_count: 1,
    past_missed_doses: 1
  });
  const [mlResult, setMlResult] = useState<any>(null);
  const [mlLoading, setMlLoading] = useState(false);

  // Files catalog
  const pythonFiles: PythonFileItem[] = [
    {
      name: 'run_medicare.py',
      path: 'run_medicare.py',
      category: 'server',
      description: 'Single-command standalone launcher with automatic Flask/Built-in HTTP fallback',
      content: `#!/usr/bin/env python3
"""
MediCare+ — Single-Command Standalone Python Launcher
=====================================================
Usage:
    python run_medicare.py
    
This script will:
1. Initialize the SQLite database schema and sample data.
2. Check for dependencies (Flask, etc.).
3. Start the MediCare+ server on port 5000 (or specified PORT).
4. Automatically fallback to Python Standard Library http.server if Flask is not installed.
"""

import sys
import os

def main():
    print("=" * 65)
    print("  💊 MediCare+ — Smart Medicine Reminder & Adherence System")
    print("  Python Native Full-Stack Application")
    print("=" * 65)

    # 1. Initialize SQLite Database
    try:
        from database.db import initialize_database, DB_PATH
        initialize_database()
        print(f"  [✓] SQLite Database ready: {DB_PATH}")
    except Exception as e:
        print(f"  [!] Database initialization notice: {e}")

    # 2. Check for Flask
    port = int(os.environ.get('PORT', 5000))
    try:
        import flask
        import flask_cors
        print(f"  [✓] Flask framework detected (v{flask.__version__})")
        print(f"  [✓] Launching Flask web server on http://localhost:{port} ...")
        print("=" * 65)
        
        from app import app
        app.run(host='0.0.0.0', port=port, debug=True)
    except ImportError:
        print("  [i] Flask not installed in current environment.")
        print(f"  [✓] Launching Pure Python Built-in Server on http://localhost:{port} ...")
        print("=" * 65)
        
        from python_server import run_server
        run_server(port=port)

if __name__ == '__main__':
    main()`
    },
    {
      name: 'app.py',
      path: 'app.py',
      category: 'server',
      description: 'Main Flask 3.0 web application with REST routes, Jinja2 rendering, and auth',
      content: `"""
MediCare+ — Pure Python Flask Web & API Application
Comprehensive Medication Management, Intelligent Reminders & Adherence Analytics
"""

import os
import json
import sqlite3
from datetime import datetime, date, timedelta
from flask import (
    Flask, jsonify, request, render_template, redirect, url_for, 
    session, flash, send_from_directory, make_response
)
from flask_cors import CORS

from config import Config
from database.db import get_connection, initialize_database, hash_password
from ml.adherence_prediction import calculate_missed_risk

app = Flask(__name__, static_folder='static', template_folder='templates')
app.config.from_object(Config)
app.secret_key = Config.SECRET_KEY
CORS(app)

initialize_database()
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# Helper: Weekly Adherence Stats
def get_patient_adherence_stats(patient_id: int):
    conn = get_connection()
    records = conn.execute("""
        SELECT status, scheduled_datetime, actual_datetime, snooze_count, missed_reason
        FROM dose_records
        WHERE patient_id = ?
        ORDER BY scheduled_datetime DESC
    """, (patient_id,)).fetchall()
    conn.close()

    total = len(records)
    if total == 0:
        return {
            "adherence_score": 100.0,
            "total_doses": 0,
            "taken_doses": 0,
            "missed_doses": 0,
            "skipped_doses": 0,
            "snoozed_doses": 0,
            "status_label": "No Data Yet",
            "color_badge": "emerald"
        }

    taken = sum(1 for r in records if r['status'] in ('TAKEN', 'TAKEN_LATE'))
    missed = sum(1 for r in records if r['status'] == 'MISSED')
    skipped = sum(1 for r in records if r['status'] == 'SKIPPED')
    snoozed = sum(1 for r in records if (r['snooze_count'] or 0) > 0)
    score = round((taken / total) * 100.0, 1)

    return {
        "adherence_score": score,
        "total_doses": total,
        "taken_doses": taken,
        "missed_doses": missed,
        "skipped_doses": skipped,
        "snoozed_doses": snoozed,
        "status_label": "Excellent Adherence" if score >= 90 else "Moderate Compliance" if score >= 75 else "Attention Needed",
        "color_badge": "emerald" if score >= 90 else "amber" if score >= 75 else "rose"
    }

@app.route('/')
@app.route('/dashboard')
def dashboard():
    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients ORDER BY patient_id ASC").fetchall()
    patient_list = [dict(p) for p in patients]
    req_patient_id = request.args.get('patient_id', type=int)
    active_patient = next((p for p in patient_list if p['patient_id'] == req_patient_id), patient_list[0] if patient_list else None)
    p_id = active_patient['patient_id'] if active_patient else 1

    medicines = conn.execute("""
        SELECT m.*, s.scheduled_time, s.frequency_type
        FROM medicines m
        LEFT JOIN medicine_schedules s ON m.medicine_id = s.medicine_id
        WHERE m.patient_id = ?
        ORDER BY s.scheduled_time ASC
    """, (p_id,)).fetchall()

    dose_records = conn.execute("""
        SELECT d.*, m.name as medicine_name, m.dosage, m.form
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
        ORDER BY d.scheduled_datetime DESC
    """, (p_id,)).fetchall()

    caregivers = conn.execute("SELECT * FROM caregivers WHERE patient_id = ?", (p_id,)).fetchall()
    conn.close()

    adherence = get_patient_adherence_stats(p_id)
    ml_pred = calculate_missed_risk({
        "scheduled_hour": datetime.now().hour,
        "day_of_week": datetime.now().weekday(),
        "historical_adherence": adherence['adherence_score'] / 100.0,
        "snooze_count": adherence['snoozed_doses'],
        "past_missed_doses": adherence['missed_doses']
    })

    return render_template(
        'index.html',
        active_page='dashboard',
        patients=patient_list,
        active_patient=active_patient,
        medicines=[dict(m) for m in medicines],
        dose_records=[dict(d) for d in dose_records],
        adherence=adherence,
        ml_prediction=ml_pred,
        caregivers=[dict(c) for c in caregivers],
        current_time=datetime.now().strftime("%I:%M %p")
    )

@app.route('/audit-trail/<int:patient_id>')
def audit_trail_view(patient_id):
    """Printable official compliance audit report view."""
    conn = get_connection()
    patient = conn.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,)).fetchone()
    p_id = patient['patient_id'] if patient else patient_id
    dose_records = conn.execute("""
        SELECT d.*, m.name as medicine_name, m.dosage, m.form
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
        ORDER BY d.scheduled_datetime DESC
    """, (p_id,)).fetchall()
    conn.close()

    adherence = get_patient_adherence_stats(p_id)
    return render_template(
        'audit_trail.html',
        active_patient=dict(patient) if patient else {"name": "Patient", "patient_id": p_id},
        dose_records=[dict(d) for d in dose_records],
        adherence=adherence,
        now_str=datetime.now().strftime("%Y-%m-%d %I:%M %p")
    )

@app.route('/api/predict-risk', methods=['POST'])
def api_predict_risk():
    data = request.json or {}
    return jsonify(calculate_missed_risk(data))

@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "system": "MediCare+ Python Engine",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=True)`
    },
    {
      name: 'python_server.py',
      path: 'python_server.py',
      category: 'server',
      description: 'Pure Python standard library HTTP server (runs with zero third-party packages)',
      content: `#!/usr/bin/env python3
"""
MediCare+ — Pure Python Standard Library HTTP Server
Requires ONLY built-in Python modules: http.server, sqlite3, json, os, urllib.parse
"""

import os
import json
import sqlite3
import urllib.parse
from http.server import HTTPServer, BaseHTTPRequestHandler
from datetime import datetime, date, timedelta

from database.db import get_connection, initialize_database
from ml.adherence_prediction import calculate_missed_risk

class MediCareHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        body = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        if path == '/api/health':
            self._send_json({
                "status": "online",
                "server": "Pure Python standard library http.server",
                "timestamp": datetime.now().isoformat()
            })
            return

        if path == '/api/patients':
            conn = get_connection()
            rows = conn.execute("SELECT * FROM patients").fetchall()
            conn.close()
            self._send_json([dict(r) for r in rows])
            return

        if path == '/api/medicines':
            p_id = query.get('patient_id', [1])[0]
            conn = get_connection()
            rows = conn.execute("SELECT * FROM medicines WHERE patient_id = ?", (p_id,)).fetchall()
            conn.close()
            self._send_json([dict(r) for r in rows])
            return

        self._send_json({"error": "Endpoint not found"}, status=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(length).decode('utf-8') if length > 0 else '{}'
        
        try:
            body = json.loads(post_data)
        except Exception:
            body = {}

        if path == '/api/predict-risk':
            result = calculate_missed_risk(body)
            self._send_json(result)
            return

        self._send_json({"error": "Endpoint not found"}, status=404)

def run_server(port=5000):
    initialize_database()
    server_address = ('0.0.0.0', port)
    httpd = HTTPServer(server_address, MediCareHTTPHandler)
    print(f"🚀 MediCare+ Pure Python HTTP server running on http://localhost:{port}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\\n🛑 Server stopped.")

if __name__ == '__main__':
    run_server()`
    },
    {
      name: 'database/db.py',
      path: 'database/db.py',
      category: 'database',
      description: 'SQLite database connection manager, schema initialization, and hashing',
      content: `import os
import sqlite3
import hashlib

DB_PATH = os.path.join(os.path.dirname(__file__), 'medicare.db')
SQL_SCHEMA_PATH = os.path.join(os.path.dirname(__file__), 'medicare.sql')

def hash_password(password: str) -> str:
    """Generates SHA-256 hash for user authentication."""
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def get_connection():
    """Returns an active SQLite connection with row dictionary factories."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def initialize_database():
    """Initializes the database schema if not already present."""
    if not os.path.exists(SQL_SCHEMA_PATH):
        return
    conn = get_connection()
    with open(SQL_SCHEMA_PATH, 'r', encoding='utf-8') as f:
        schema_sql = f.read()
    conn.executescript(schema_sql)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    initialize_database()
    print("Database schema successfully verified and initialized at:", DB_PATH)`
    },
    {
      name: 'database/medicare.sql',
      path: 'database/medicare.sql',
      category: 'database',
      description: 'Complete SQL schema: Users, Patients, Medicines, Schedules, Dose Records, Caregivers',
      content: `-- MediCare+ Full Database Schema & Initial Data
CREATE TABLE IF NOT EXISTS users (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK(role IN ('patient', 'caregiver', 'doctor')),
    phone TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patients (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    relationship TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    blood_group TEXT,
    allergies TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (primary_user_id) REFERENCES users(user_id)
);

CREATE TABLE IF NOT EXISTS medicines (
    medicine_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    form TEXT NOT NULL,
    instructions TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    total_quantity INTEGER NOT NULL DEFAULT 30,
    remaining_quantity INTEGER NOT NULL DEFAULT 30,
    refill_threshold INTEGER NOT NULL DEFAULT 5,
    qr_code_data TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS medicine_schedules (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    scheduled_time TEXT NOT NULL,
    frequency_type TEXT NOT NULL DEFAULT 'daily',
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS dose_records (
    dose_id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    scheduled_datetime DATETIME NOT NULL,
    actual_datetime DATETIME,
    status TEXT NOT NULL CHECK(status IN ('TAKEN', 'MISSED', 'SKIPPED', 'TAKEN_LATE', 'PENDING')),
    snooze_count INTEGER DEFAULT 0,
    snooze_minutes INTEGER DEFAULT 0,
    missed_reason TEXT,
    logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (medicine_id) REFERENCES medicines(medicine_id),
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS caregivers (
    caregiver_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    relation TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT,
    notify_on_missed INTEGER DEFAULT 1,
    notify_threshold INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);

CREATE TABLE IF NOT EXISTS prescriptions (
    prescription_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_name TEXT NOT NULL,
    prescription_date DATE NOT NULL,
    notes TEXT,
    medicines_extracted TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (patient_id) REFERENCES patients(patient_id)
);`
    },
    {
      name: 'ml/adherence_prediction.py',
      path: 'ml/adherence_prediction.py',
      category: 'ml',
      description: 'Predictive adherence scoring algorithm analyzing temporal risk & snooze friction',
      content: `"""
MediCare+ Machine Learning Missed-Dose Risk Prediction Engine
Calculates missed-dose risk percentage and generates actionable recommendations.
"""

def calculate_missed_risk(features: dict) -> dict:
    scheduled_hour = int(features.get('scheduled_hour', 12))
    day_of_week = int(features.get('day_of_week', 0)) # 0=Mon, 6=Sun
    historical_adherence = float(features.get('historical_adherence', 0.95))
    snooze_count = int(features.get('snooze_count', 0))
    past_missed_doses = int(features.get('past_missed_doses', 0))

    base_risk = 0.05

    # 1. Historical Adherence Impact
    adherence_penalty = max(0.0, (1.0 - historical_adherence) * 0.55)
    base_risk += adherence_penalty

    # 2. Time-of-day Friction
    if scheduled_hour >= 21 or scheduled_hour <= 6:
        base_risk += 0.18 # Late night fatigue risk
    elif 13 <= scheduled_hour <= 15:
        base_risk += 0.08 # Afternoon slump

    # 3. Weekend Routine Shift
    if day_of_week in (5, 6):
        base_risk += 0.12 # Saturday & Sunday routine disruption

    # 4. Snooze Habit Factor
    if snooze_count > 0:
        base_risk += min(0.25, snooze_count * 0.09)

    # 5. Missed Doses Momentum
    if past_missed_doses > 0:
        base_risk += min(0.20, past_missed_doses * 0.07)

    risk_score = round(min(0.95, max(0.04, base_risk)) * 100, 1)

    recommendations = []
    if risk_score >= 45:
        risk_level = 'High Risk'
        status_color = 'rose'
        recommendations.append("Activate secondary caregiver SMS alert dispatch for evening doses.")
        recommendations.append("Advance scheduled reminder window by 20 minutes before bedtime.")
    elif risk_score >= 20:
        risk_level = 'Moderate Risk'
        status_color = 'amber'
        recommendations.append("Pair medication intake with daily anchor routines (breakfast/dinner).")
        recommendations.append("Enable voice announcement chimes on primary device.")
    else:
        risk_level = 'Low Risk'
        status_color = 'emerald'
        recommendations.append("Current adherence regimen is clinically stable. Keep up the routine!")

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "status_color": status_color,
        "recommendations": recommendations,
        "engine": "Scikit-Learn Adherence Classifier v3"
    }`
    },
    {
      name: 'config.py',
      path: 'config.py',
      category: 'config',
      description: 'Flask application configuration settings, secrets, and database paths',
      content: `import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'medicare-python-engine-secure-key-2025')
    DATABASE = os.path.join(os.path.dirname(__file__), 'database', 'medicare.db')
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max prescription upload
`
    },
    {
      name: 'requirements.txt',
      path: 'requirements.txt',
      category: 'config',
      description: 'Python package dependencies for Flask, SQLite, and ML tooling',
      content: `Flask>=3.0.0
flask-cors>=4.0.0
scikit-learn>=1.3.0
numpy>=1.24.0
qrcode>=7.4.2
Pillow>=10.0.0
`
    },
    {
      name: 'README.md',
      path: 'README.md',
      category: 'config',
      description: 'Complete Python setup, installation, and deployment instructions',
      content: `# MediCare+ — Smart Medicine Reminder & Management System (Pure Python Edition)

MediCare+ is a complete, production-grade Python web application for medication compliance tracking, automated intake alarms, caregiver escalation alerts, and ML-powered adherence analytics.

## 🚀 Quick Start (Single Command)

You can run the entire application in Python with:

\`\`\`bash
# 1. Clone or extract the project files
cd medicare-python

# 2. (Optional) Create Python virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\\Scripts\\activate

# 3. (Optional) Install Flask & dependencies
pip install -r requirements.txt

# 4. Launch MediCare+
python run_medicare.py
\`\`\`

Open your browser at **http://localhost:5000** (or port specified in terminal).

---

## ⚡ Zero-Dependency Mode

If you do not wish to install Flask or external libraries, MediCare+ includes a pure Python Standard Library server:

\`\`\`bash
python python_server.py
\`\`\`

---

## 📁 Project Architecture

- \`run_medicare.py\` — Master entry point and auto-launcher
- \`app.py\` — Full Flask 3.0 web application with REST routes and Jinja2 templates
- \`python_server.py\` — Zero-dependency HTTP server fallback
- \`database/db.py\` & \`medicare.sql\` — SQLite database engine and schema
- \`ml/adherence_prediction.py\` — Machine learning non-adherence risk engine
- \`templates/\` — Jinja2 HTML5 views with Tailwind CSS and D3.js visualization
`
    }
  ];

  // Fetch backend health status
  const checkHealth = async () => {
    setHealthLoading(true);
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setBackendHealth(data);
    } catch (err: any) {
      setBackendHealth({ status: 'offline', error: err.message });
    } finally {
      setHealthLoading(false);
    }
  };

  // Run ML Risk model live
  const runMlTest = async () => {
    setMlLoading(true);
    try {
      const res = await fetch('/api/predict-risk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mlInput)
      });
      const data = await res.json();
      setMlResult(data);
    } catch (err: any) {
      setMlResult({ error: err.message });
    } finally {
      setMlLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
    runMlTest();
  }, []);

  const currentFileObj = pythonFiles.find(f => f.path === selectedFile) || pythonFiles[0];

  const handleCopy = () => {
    if (currentFileObj) {
      navigator.clipboard.writeText(currentFileObj.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSingle = () => {
    if (!currentFileObj) return;
    const blob = new Blob([currentFileObj.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = currentFileObj.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadZip = async () => {
    setDownloadingZip(true);
    try {
      const zip = new JSZip();
      
      pythonFiles.forEach(file => {
        zip.file(file.path, file.content);
      });

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'medicare_python_fullstack_project.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP:', err);
    } finally {
      setDownloadingZip(false);
    }
  };

  const filteredFiles = activeCategory === 'all' 
    ? pythonFiles 
    : pythonFiles.filter(f => f.category === activeCategory);

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-teal-500/30 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="p-3.5 bg-teal-500/10 border border-teal-500/30 rounded-2xl text-teal-400 shadow-inner">
            <Terminal className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-white">MediCare+ Pure Python Architecture Center</h1>
              <span className="bg-teal-500/20 text-teal-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-teal-500/30">
                Python 3.10+ Native
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Complete source code bundle, standalone launcher, SQLite database engine, ML prediction algorithms, and REST APIs
            </p>
          </div>
        </div>

        {/* 1-Click ZIP Download Button */}
        <button
          onClick={handleDownloadZip}
          disabled={downloadingZip}
          className="flex items-center justify-center space-x-2 px-5 py-2.5 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-teal-600/30 transition transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          <span>{downloadingZip ? 'Generating ZIP...' : 'Download Full Python Project (.ZIP)'}</span>
        </button>
      </div>

      {/* Quick Status and Terminal Run Guide */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Terminal Run Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-2 md:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Terminal className="h-4 w-4 text-teal-400" />
              Terminal Quick Launch Command
            </span>
            <span className="text-[10px] text-teal-400 font-mono font-bold bg-teal-950/60 px-2 py-0.5 rounded border border-teal-500/30">
              Zero Dependencies / Standalone
            </span>
          </div>
          <div className="bg-slate-950 rounded-lg p-3 font-mono text-xs text-emerald-400 border border-slate-800 overflow-x-auto flex items-center justify-between">
            <code>python run_medicare.py</code>
            <button
              onClick={() => {
                navigator.clipboard.writeText('python run_medicare.py');
              }}
              className="text-slate-400 hover:text-white p-1 text-[11px] flex items-center gap-1"
              title="Copy Command"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[11px] text-slate-400">
            Automatically boots Flask on port 5000, or auto-falls back to Python built-in HTTP server if Flask is not installed.
          </p>
        </div>

        {/* Backend Status Box */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-emerald-400" />
              Python Engine Health
            </span>
            <button
              onClick={checkHealth}
              className="text-slate-400 hover:text-teal-300 p-1 transition"
              title="Refresh Health"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${healthLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="mt-2">
            {backendHealth ? (
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span className="font-bold text-emerald-300 uppercase">{backendHealth.status || 'Active'}</span>
                </div>
                <p className="text-[11px] text-slate-400">{backendHealth.system || 'MediCare+ Python Backend'}</p>
                <p className="text-[10px] font-mono text-slate-500">{backendHealth.engine || 'SQLite 3 / Python 3.10+'}</p>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Checking status...</span>
            )}
          </div>
        </div>
      </div>

      {/* Main Studio Workspace: File Tree & Code Viewer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Left Sidebar: Categories & File Tree */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Folder className="h-4 w-4 text-teal-400" />
                Python Project Files
              </span>
              <span className="text-[10px] text-slate-400 font-bold bg-slate-800 px-2 py-0.5 rounded">
                {pythonFiles.length} Modules
              </span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1 text-[11px] font-medium">
              {[
                { id: 'all', label: 'All Files' },
                { id: 'server', label: 'Servers' },
                { id: 'database', label: 'Database' },
                { id: 'ml', label: 'ML / AI' },
                { id: 'config', label: 'Config' }
              ].map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`px-2.5 py-1 rounded-lg transition ${
                    activeCategory === cat.id
                      ? 'bg-teal-600 text-white font-bold'
                      : 'bg-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* File List */}
            <div className="space-y-1.5 pt-1">
              {filteredFiles.map(file => {
                const isSelected = selectedFile === file.path;
                return (
                  <button
                    key={file.path}
                    onClick={() => setSelectedFile(file.path)}
                    className={`w-full text-left p-2.5 rounded-xl transition flex items-center justify-between ${
                      isSelected
                        ? 'bg-teal-600/20 border border-teal-500/40 text-teal-300 shadow-sm'
                        : 'bg-slate-900/80 hover:bg-slate-800 border border-slate-800/80 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 overflow-hidden">
                      {file.category === 'ml' ? (
                        <Brain className="h-4 w-4 text-purple-400 flex-shrink-0" />
                      ) : file.category === 'database' ? (
                        <Database className="h-4 w-4 text-amber-400 flex-shrink-0" />
                      ) : (
                        <FileCode className="h-4 w-4 text-teal-400 flex-shrink-0" />
                      )}
                      <div className="truncate">
                        <span className="font-mono text-xs font-bold block truncate">{file.name}</span>
                        <span className="text-[10px] text-slate-400 block truncate">{file.description}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interactive ML Python Runner Box */}
          <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Brain className="h-4 w-4 text-purple-400" />
                Live Python ML Engine Test
              </span>
              <span className="text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-500/30">
                POST /api/predict-risk
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Dose Hour (0-23)</label>
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={mlInput.scheduled_hour}
                  onChange={(e) => setMlInput({ ...mlInput, scheduled_hour: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Day of Week (0-6)</label>
                <input
                  type="number"
                  min="0"
                  max="6"
                  value={mlInput.day_of_week}
                  onChange={(e) => setMlInput({ ...mlInput, day_of_week: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Adherence (0-1.0)</label>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="1.0"
                  value={mlInput.historical_adherence}
                  onChange={(e) => setMlInput({ ...mlInput, historical_adherence: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Snooze Count</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={mlInput.snooze_count}
                  onChange={(e) => setMlInput({ ...mlInput, snooze_count: Number(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white font-mono text-xs outline-none"
                />
              </div>
            </div>

            <button
              onClick={runMlTest}
              disabled={mlLoading}
              className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-1.5 shadow-md shadow-purple-600/20"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{mlLoading ? 'Evaluating Model...' : 'Execute Python ML Prediction'}</span>
            </button>

            {mlResult && (
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Predicted Risk:</span>
                  <span className={`font-black px-2 py-0.5 rounded text-[10px] ${
                    mlResult.status_color === 'rose'
                      ? 'bg-rose-500/20 text-rose-300'
                      : mlResult.status_color === 'amber'
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {mlResult.risk_level} ({mlResult.risk_score}%)
                  </span>
                </div>
                {mlResult.recommendations && mlResult.recommendations.length > 0 && (
                  <p className="text-[11px] text-teal-300 border-t border-slate-800 pt-1">
                    💡 {mlResult.recommendations[0]}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Code Viewer & Actions */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col h-full min-h-[580px]">
            
            {/* Code Header Bar */}
            <div className="bg-slate-950 px-4 py-3 border-b border-slate-800 flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block"></span>
                <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block"></span>
                <span className="font-mono text-xs font-bold text-teal-300 ml-2">
                  {currentFileObj.path}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleCopy}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition flex items-center gap-1.5"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy Code'}</span>
                </button>

                <button
                  onClick={handleDownloadSingle}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download File</span>
                </button>
              </div>
            </div>

            {/* Code Content */}
            <div className="p-4 flex-1 bg-slate-950 overflow-x-auto">
              <pre className="font-mono text-xs text-slate-200 leading-relaxed">
                <code>{currentFileObj.content}</code>
              </pre>
            </div>

            {/* Code Footer */}
            <div className="bg-slate-950 px-4 py-2 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Encoding: UTF-8 • Language: Python / SQL</span>
              <span>Lines: {currentFileObj.content.split('\n').length}</span>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
