"""
MediCare+ — Pure Python Flask Web & API Application
Comprehensive Medication Management, Intelligent Reminders & Adherence Analytics
"""

import os
import io
import csv
import json
import sqlite3
from datetime import datetime, date, timedelta
try:
    from flask import (
        Flask, jsonify, request, render_template, redirect, url_for, 
        session, flash, send_from_directory, make_response
    )
    from flask_cors import CORS
    HAS_FLASK = True
except ImportError:
    HAS_FLASK = False
    Flask = None
    CORS = None

from config import Config
from database.db import get_connection, initialize_database, hash_password
from ml.adherence_prediction import calculate_missed_risk

# Initialize Flask application if available
if HAS_FLASK:
    app = Flask(__name__, static_folder='static', template_folder='templates')
    app.config.from_object(Config)
    app.secret_key = Config.SECRET_KEY
    if CORS:
        CORS(app)
else:
    class MockFlask:
        secret_key = Config.SECRET_KEY
        config = {}
        def route(self, *args, **kwargs):
            def decorator(f):
                return f
            return decorator
    app = MockFlask()

# Ensure Database and Upload folders are initialized
initialize_database()
os.makedirs(Config.UPLOAD_FOLDER, exist_ok=True)

# ----------------------------------------------------
# Helper Functions
# ----------------------------------------------------
def get_current_user():
    """Returns the currently logged in user dict from session or defaults to demo patient."""
    user_id = session.get('user_id')
    if not user_id:
        return None
    conn = get_connection()
    user = conn.execute("SELECT user_id, full_name, email, role FROM users WHERE user_id = ?", (user_id,)).fetchone()
    conn.close()
    return dict(user) if user else None

def get_patient_adherence_stats(patient_id: int):
    """Calculates weekly adherence percentage and metrics for a patient."""
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
    
    if score >= 90:
        label = "Excellent Adherence"
        color = "emerald"
    elif score >= 75:
        label = "Moderate Compliance"
        color = "amber"
    else:
        label = "Attention Needed"
        color = "rose"

    return {
        "adherence_score": score,
        "total_doses": total,
        "taken_doses": taken,
        "missed_doses": missed,
        "skipped_doses": skipped,
        "snoozed_doses": snoozed,
        "status_label": label,
        "color_badge": color
    }

def get_request_data():
    """Safely extracts JSON or Form payload without throwing 415 Unsupported Media Type."""
    if request.is_json:
        parsed = request.get_json(silent=True)
        if parsed is not None:
            return parsed
    if request.form:
        return request.form.to_dict()
    return {}

# ----------------------------------------------------
# Authentication & User Management Routes
# ----------------------------------------------------
@app.route('/login', methods=['GET', 'POST'])
def login_view():
    error = None
    if request.method == 'POST':
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        pwd_hash = hash_password(password)

        conn = get_connection()
        user = conn.execute("SELECT * FROM users WHERE LOWER(email) = ? AND password_hash = ?", (email, pwd_hash)).fetchone()
        conn.close()

        if user:
            session['user_id'] = user['user_id']
            session['user_role'] = user['role']
            session['full_name'] = user['full_name']
            flash(f"Welcome back, {user['full_name']}!", "success")
            
            # Redirect according to role
            if user['role'] == 'doctor':
                return redirect(url_for('doctor_portal_view'))
            elif user['role'] == 'caregiver':
                return redirect(url_for('caregiver_portal_view'))
            return redirect(url_for('index_view'))
        else:
            error = "Invalid email address or password. Please check and try again."

    return render_template('login.html', error=error)

@app.route('/demo-login/<role>')
def demo_quick_login(role):
    """Instant 1-click test login for Patient, Doctor, or Caregiver."""
    email_map = {
        'patient': 'demo@medicare.org',
        'doctor': 'doctor@medicare.org',
        'caregiver': 'caregiver@medicare.org'
    }
    target_email = email_map.get(role, 'demo@medicare.org')
    
    conn = get_connection()
    user = conn.execute("SELECT * FROM users WHERE email = ?", (target_email,)).fetchone()
    conn.close()

    if user:
        session['user_id'] = user['user_id']
        session['user_role'] = user['role']
        session['full_name'] = user['full_name']
        flash(f"Logged in as {user['full_name']} ({user['role'].title()})", "info")
        
        if user['role'] == 'doctor':
            return redirect(url_for('doctor_portal_view'))
        elif user['role'] == 'caregiver':
            return redirect(url_for('caregiver_portal_view'))
    return redirect(url_for('index_view'))

@app.route('/register', methods=['GET', 'POST'])
def register_view():
    error = None
    if request.method == 'POST':
        full_name = request.form.get('full_name', '').strip()
        email = request.form.get('email', '').strip().lower()
        password = request.form.get('password', '').strip()
        confirm_pwd = request.form.get('confirm_password', '').strip()
        role = request.form.get('role', 'patient')

        if password != confirm_pwd:
            error = "Passwords do not match."
        elif len(password) < 6:
            error = "Password must be at least 6 characters."
        elif not full_name or not email:
            error = "All fields are required."
        else:
            conn = get_connection()
            existing = conn.execute("SELECT user_id FROM users WHERE LOWER(email) = ?", (email,)).fetchone()
            if existing:
                error = "An account with this email address already exists."
                conn.close()
            else:
                pwd_hash = hash_password(password)
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT INTO users (full_name, email, password_hash, role) VALUES (?, ?, ?, ?)",
                    (full_name, email, pwd_hash, role)
                )
                new_user_id = cursor.lastrowid
                
                # Automatically create patient profile for patient accounts
                if role == 'patient':
                    cursor.execute(
                        "INSERT INTO patients (primary_user_id, name, relationship, age, gender) VALUES (?, ?, 'Self', 30, 'Not specified')",
                        (new_user_id, full_name)
                    )
                conn.commit()
                conn.close()

                session['user_id'] = new_user_id
                session['user_role'] = role
                session['full_name'] = full_name
                flash("Account created successfully!", "success")
                
                if role == 'doctor':
                    return redirect(url_for('doctor_portal_view'))
                elif role == 'caregiver':
                    return redirect(url_for('caregiver_portal_view'))
                return redirect(url_for('index_view'))

    return render_template('register.html', error=error)

@app.route('/logout')
def logout_view():
    session.clear()
    flash("You have been signed out.", "info")
    return redirect(url_for('login_view'))

# ----------------------------------------------------
# Main Dashboard & View Routes
# ----------------------------------------------------
@app.route('/')
@app.route('/dashboard')
def index_view():
    current_user = get_current_user()
    if not current_user:
        return redirect(url_for('login_view'))

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients ORDER BY patient_id ASC").fetchall()
    patient_list = [dict(p) for p in patients]

    # Active patient selection
    req_patient_id = request.args.get('patient_id', type=int)
    active_patient = None
    if req_patient_id:
        active_patient = next((p for p in patient_list if p['patient_id'] == req_patient_id), None)
    if not active_patient and patient_list:
        active_patient = patient_list[0]

    p_id = active_patient['patient_id'] if active_patient else 1

    # Load active patient medicines
    medicines = conn.execute("""
        SELECT m.*, s.scheduled_time, s.frequency_type
        FROM medicines m
        LEFT JOIN medicine_schedules s ON m.medicine_id = s.medicine_id
        WHERE m.patient_id = ?
        ORDER BY s.scheduled_time ASC
    """, (p_id,)).fetchall()
    
    med_list = []
    for m in medicines:
        m_dict = dict(m)
        m_dict['snooze_interval_minutes'] = m_dict.get('snooze_interval_minutes') or 10
        m_dict['needs_refill'] = m_dict['remaining_quantity'] <= m_dict['refill_threshold']
        m_dict['days_remaining'] = max(0, round(m_dict['remaining_quantity'] / 2, 1))
        med_list.append(m_dict)

    # Load Dose Records for compliance table
    dose_records = conn.execute("""
        SELECT d.*, m.name as medicine_name, m.dosage, m.form
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
        ORDER BY d.scheduled_datetime DESC
    """, (p_id,)).fetchall()
    dose_list = [dict(d) for d in dose_records]

    # Caregivers for patient
    caregivers = conn.execute("SELECT * FROM caregivers WHERE patient_id = ?", (p_id,)).fetchall()
    caregiver_list = [dict(c) for c in caregivers]
    conn.close()

    # Adherence Statistics
    adherence = get_patient_adherence_stats(p_id)

    # ML Missed-Dose Risk Prediction
    ml_prediction = calculate_missed_risk({
        "scheduled_hour": datetime.now().hour,
        "day_of_week": datetime.now().weekday(),
        "historical_adherence": adherence['adherence_score'] / 100.0,
        "snooze_count": adherence['snoozed_doses'],
        "past_missed_doses": adherence['missed_doses']
    })

    return render_template(
        'index.html',
        active_page='dashboard',
        current_user=current_user,
        patients=patient_list,
        active_patient=active_patient,
        medicines=med_list,
        dose_records=dose_list,
        adherence=adherence,
        ml_prediction=ml_prediction,
        caregivers=caregiver_list,
        current_time=datetime.now().strftime("%I:%M %p")
    )

# ----------------------------------------------------
# Doctor Portal View
# ----------------------------------------------------
@app.route('/doctor-portal')
def doctor_portal_view():
    current_user = get_current_user() or {
        "full_name": "Dr. Sarah Chen, MD",
        "role": "doctor",
        "email": "doctor@medicare.org"
    }

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients ORDER BY patient_id ASC").fetchall()
    patient_list = [dict(p) for p in patients]

    # Attach stats and medicines to each patient
    for p in patient_list:
        p_id = p['patient_id']
        p['stats'] = get_patient_adherence_stats(p_id)
        meds = conn.execute("SELECT * FROM medicines WHERE patient_id = ?", (p_id,)).fetchall()
        p['medicines'] = [dict(m) for m in meds]
        p['low_stock_count'] = sum(1 for m in p['medicines'] if m['remaining_quantity'] <= m['refill_threshold'])
        p['pending_refills'] = sum(1 for m in p['medicines'] if m.get('refill_requested'))

    prescriptions = conn.execute("""
        SELECT p.*, pt.name as patient_name
        FROM prescriptions p
        JOIN patients pt ON p.patient_id = pt.patient_id
        ORDER BY p.prescription_date DESC
    """).fetchall()
    rx_list = [dict(pr) for pr in prescriptions]

    # Refill requests awaiting authorization
    refills = conn.execute("""
        SELECT r.*, m.name as medicine_name, m.dosage, m.remaining_quantity, pt.name as patient_name
        FROM refill_notifications r
        JOIN medicines m ON r.medicine_id = m.medicine_id
        JOIN patients pt ON r.patient_id = pt.patient_id
        WHERE r.status = 'PENDING'
        ORDER BY r.created_at DESC
    """).fetchall()
    refill_list = [dict(rf) for rf in refills]
    conn.close()

    return render_template(
        'doctor_portal.html',
        active_page='doctor-portal',
        current_user=current_user,
        patients=patient_list,
        prescriptions=rx_list,
        refill_requests=refill_list
    )

# ----------------------------------------------------
# Caregiver Portal View
# ----------------------------------------------------
@app.route('/caregiver-portal')
def caregiver_portal_view():
    current_user = get_current_user() or {
        "full_name": "Marcus Johnson",
        "role": "caregiver",
        "email": "caregiver@medicare.org"
    }

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients ORDER BY patient_id ASC").fetchall()
    patient_list = [dict(p) for p in patients]

    # Selected patient
    req_patient_id = request.args.get('patient_id', type=int)
    active_patient = next((p for p in patient_list if p['patient_id'] == req_patient_id), patient_list[0] if patient_list else None)

    p_id = active_patient['patient_id'] if active_patient else 1

    medicines = conn.execute("SELECT * FROM medicines WHERE patient_id = ?", (p_id,)).fetchall()
    med_list = []
    for m in medicines:
        m_dict = dict(m)
        m_dict['needs_refill'] = m_dict['remaining_quantity'] <= m_dict['refill_threshold']
        med_list.append(m_dict)

    dose_records = conn.execute("""
        SELECT d.*, m.name as medicine_name, m.dosage
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
        ORDER BY d.scheduled_datetime DESC
    """, (p_id,)).fetchall()

    caregivers = conn.execute("SELECT * FROM caregivers WHERE patient_id = ?", (p_id,)).fetchall()
    conn.close()

    adherence = get_patient_adherence_stats(p_id)

    return render_template(
        'caregiver_portal.html',
        active_page='caregiver-portal',
        current_user=current_user,
        patients=patient_list,
        active_patient=active_patient,
        medicines=med_list,
        dose_records=[dict(d) for d in dose_records],
        adherence=adherence,
        caregivers=[dict(c) for c in caregivers]
    )

# ----------------------------------------------------
# Medications, Prescriptions, Caregivers & Dose History
# ----------------------------------------------------
@app.route('/medications')
def medications_view():
    current_user = get_current_user()
    patient_id = request.args.get('patient_id', 1, type=int)
    
    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    medicines = conn.execute("SELECT * FROM medicines WHERE patient_id = ?", (patient_id,)).fetchall()
    conn.close()

    med_list = []
    for m in medicines:
        m_dict = dict(m)
        m_dict['snooze_interval_minutes'] = m_dict.get('snooze_interval_minutes') or 10
        m_dict['days_remaining'] = max(0, round(m_dict['remaining_quantity'] / 2, 1))
        m_dict['needs_refill'] = m_dict['remaining_quantity'] <= m_dict['refill_threshold']
        med_list.append(m_dict)

    return render_template(
        'medications.html',
        active_page='medications',
        current_user=current_user,
        patients=[dict(p) for p in patients],
        patient_id=patient_id,
        medicines=med_list
    )

@app.route('/prescriptions')
def prescriptions_view():
    current_user = get_current_user()
    patient_id = request.args.get('patient_id', 1, type=int)

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    prescriptions = conn.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC", (patient_id,)).fetchall()
    conn.close()

    return render_template(
        'prescriptions.html',
        active_page='prescriptions',
        current_user=current_user,
        patients=[dict(p) for p in patients],
        patient_id=patient_id,
        prescriptions=[dict(p) for p in prescriptions]
    )

@app.route('/caregivers')
def caregivers_view():
    current_user = get_current_user()
    patient_id = request.args.get('patient_id', 1, type=int)

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    caregivers = conn.execute("SELECT * FROM caregivers WHERE patient_id = ?", (patient_id,)).fetchall()
    conn.close()

    return render_template(
        'caregivers.html',
        active_page='caregivers',
        current_user=current_user,
        patients=[dict(p) for p in patients],
        patient_id=patient_id,
        caregivers=[dict(c) for c in caregivers]
    )

@app.route('/dose-history')
def dose_history_view():
    """Dedicated Full Compliance History Logs View."""
    current_user = get_current_user()
    patient_id = request.args.get('patient_id', 1, type=int)
    filter_status = request.args.get('status', 'ALL')

    conn = get_connection()
    patients = conn.execute("SELECT * FROM patients").fetchall()
    
    query = """
        SELECT d.*, m.name as medicine_name, m.dosage, m.form
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
    """
    params = [patient_id]
    
    if filter_status == 'TAKEN':
        query += " AND d.status IN ('TAKEN', 'TAKEN_LATE')"
    elif filter_status == 'MISSED':
        query += " AND d.status IN ('MISSED', 'SKIPPED')"
    
    query += " ORDER BY d.scheduled_datetime DESC"
    dose_records = conn.execute(query, tuple(params)).fetchall()
    conn.close()

    adherence = get_patient_adherence_stats(patient_id)

    return render_template(
        'dose_history.html',
        active_page='dose-history',
        current_user=current_user,
        patients=[dict(p) for p in patients],
        patient_id=patient_id,
        dose_records=[dict(d) for d in dose_records],
        adherence=adherence,
        filter_status=filter_status
    )

@app.route('/audit-trail/<int:patient_id>')
def audit_trail_view(patient_id):
    """Printable official compliance audit report view."""
    conn = get_connection()
    patient = conn.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,)).fetchone()
    if not patient:
        patient = conn.execute("SELECT * FROM patients LIMIT 1").fetchone()
    
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
        active_patient=dict(patient) if patient else {"name": "Patient", "patient_id": p_id, "age": 35, "gender": "Other", "relationship": "Self"},
        dose_records=[dict(d) for d in dose_records],
        adherence=adherence,
        now_str=datetime.now().strftime("%Y-%m-%d %I:%M %p")
    )

@app.route('/export-dose-history-csv/<int:patient_id>')
@app.route('/api/dose-history/csv')
def export_dose_history_csv(patient_id=None):
    """
    Exports the complete daily intake and dose compliance history for a specific patient as a standard CSV file.
    """
    if patient_id is None:
        patient_id = request.args.get('patient_id', 1, type=int)
    
    filter_status = request.args.get('status', 'ALL')
    search_query = request.args.get('q', '').strip()

    conn = get_connection()
    patient = conn.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,)).fetchone()
    patient_name = patient['name'] if patient else f"Patient_{patient_id}"

    query = """
        SELECT d.*, m.name as medicine_name, m.dosage, m.form, m.instructions
        FROM dose_records d
        JOIN medicines m ON d.medicine_id = m.medicine_id
        WHERE d.patient_id = ?
    """
    params = [patient_id]

    if filter_status == 'TAKEN':
        query += " AND d.status IN ('TAKEN', 'TAKEN_LATE')"
    elif filter_status == 'MISSED':
        query += " AND d.status IN ('MISSED', 'SKIPPED')"

    if search_query:
        query += " AND m.name LIKE ?"
        params.append(f"%{search_query}%")

    query += " ORDER BY d.scheduled_datetime DESC"
    records = conn.execute(query, tuple(params)).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)

    # Write Clinical Audit Metadata Header
    writer.writerow(["# MediCare+ Dose Compliance & Intake Audit Export"])
    writer.writerow([f"# Patient: {patient_name} (Patient ID: {patient_id})"])
    writer.writerow([f"# Export Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
    writer.writerow([f"# Filter Applied: {filter_status}"])
    writer.writerow([f"# Total Records Exported: {len(records)}"])
    writer.writerow([])  # Separator row

    # CSV Column Headers
    headers = [
        "Record ID",
        "Patient ID",
        "Patient Name",
        "Medication Name",
        "Dosage",
        "Form",
        "Compliance Status",
        "Scheduled Date & Time",
        "Actual Intake Time",
        "Snooze Count",
        "Snooze Delay (Minutes)",
        "Reported Reason / Clinical Notes",
        "Prescription Instructions",
        "Audit Logged Timestamp"
    ]
    writer.writerow(headers)

    for r in records:
        writer.writerow([
            r['record_id'],
            patient_id,
            patient_name,
            r['medicine_name'],
            r['dosage'],
            r['form'],
            r['status'],
            r['scheduled_datetime'],
            r['actual_datetime'] or 'N/A',
            r['snooze_count'] or 0,
            r['snooze_minutes'] or 0,
            r['missed_reason'] or '',
            r['instructions'] or '',
            r['created_at'] or ''
        ])

    csv_data = output.getvalue()
    output.close()

    safe_name = "".join(c if c.isalnum() else "_" for c in patient_name.lower())
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"dose_compliance_{safe_name}_{timestamp}.csv"

    response = make_response(csv_data)
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    return response

# ----------------------------------------------------
# REST API & Form Action Endpoints
# ----------------------------------------------------
@app.route('/api/log-dose', methods=['POST'])
def log_dose():
    data = get_request_data()
    medicine_id = data.get('medicine_id')
    patient_id = data.get('patient_id', 1)
    status = data.get('status', 'TAKEN')
    missed_reason = data.get('reason') or data.get('missed_reason')
    snooze_minutes = int(data.get('snooze_minutes', 0))

    if not medicine_id:
        return jsonify({"error": "medicine_id is required"}), 400

    conn = get_connection()
    cursor = conn.cursor()

    # Look up medicine snooze interval if not explicitly provided
    if snooze_minutes <= 0 and status in ('TAKEN_LATE', 'SNOOZED'):
        med_row = cursor.execute("SELECT snooze_interval_minutes FROM medicines WHERE medicine_id = ?", (medicine_id,)).fetchone()
        if med_row and med_row['snooze_interval_minutes']:
            snooze_minutes = int(med_row['snooze_interval_minutes'])
        else:
            snooze_minutes = 10

    if status in ('TAKEN', 'TAKEN_LATE'):
        cursor.execute("""
            UPDATE medicines 
            SET remaining_quantity = MAX(0, remaining_quantity - 1)
            WHERE medicine_id = ?
        """, (medicine_id,))

    cursor.execute("""
        INSERT INTO dose_records (medicine_id, patient_id, scheduled_datetime, actual_datetime, status, snooze_count, snooze_minutes, missed_reason)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        medicine_id, 
        patient_id, 
        datetime.now().isoformat(), 
        datetime.now().isoformat() if status != 'MISSED' else None, 
        status, 
        1 if snooze_minutes > 0 else 0,
        snooze_minutes,
        missed_reason
    ))
    conn.commit()
    conn.close()

    if request.form:
        flash(f"Dose successfully recorded as {status}!", "success")
        return redirect(request.referrer or url_for('index_view'))
    return jsonify({"status": "success", "recorded_status": status, "medicine_id": medicine_id})

@app.route('/api/refill-request', methods=['POST'])
def request_refill():
    data = get_request_data()
    medicine_id = data.get('medicine_id')
    patient_id = data.get('patient_id', 1)
    requested_qty = int(data.get('requested_quantity', 30))
    notes = data.get('notes', 'Refill requested by patient')
    urgent = 1 if data.get('urgent') in (True, '1', 'true', 'on') else 0

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE medicines 
        SET refill_requested = 1, last_refill_requested_at = ?
        WHERE medicine_id = ?
    """, (datetime.now().isoformat(), medicine_id))

    cursor.execute("""
        INSERT INTO refill_notifications (medicine_id, patient_id, requested_quantity, status, urgent, notes)
        VALUES (?, ?, ?, 'PENDING', ?, ?)
    """, (medicine_id, patient_id, requested_qty, urgent, notes))
    conn.commit()
    conn.close()

    if request.form:
        flash("Refill request dispatched to assigned doctor & caregiver!", "success")
        return redirect(request.referrer or url_for('index_view'))
    return jsonify({"status": "dispatched", "medicine_id": medicine_id})

@app.route('/api/refill-authorize', methods=['POST'])
def authorize_refill():
    data = get_request_data()
    notification_id = data.get('notification_id')
    medicine_id = data.get('medicine_id')
    approved_qty = int(data.get('approved_quantity', 30))

    conn = get_connection()
    cursor = conn.cursor()
    if medicine_id:
        cursor.execute("""
            UPDATE medicines 
            SET remaining_quantity = remaining_quantity + ?, refill_requested = 0
            WHERE medicine_id = ?
        """, (approved_qty, medicine_id))
    
    if notification_id:
        cursor.execute("UPDATE refill_notifications SET status = 'APPROVED' WHERE notification_id = ?", (notification_id,))
    
    conn.commit()
    conn.close()

    if request.form:
        flash(f"Refill authorized! Added +{approved_qty} units to patient supply.", "success")
        return redirect(request.referrer or url_for('doctor_portal_view'))
    return jsonify({"status": "authorized", "added_quantity": approved_qty})

@app.route('/api/medicines', methods=['GET', 'POST'])
def api_medicines():
    if request.method == 'POST':
        data = get_request_data()
        name = data.get('name')
        dosage = data.get('dosage', '1 tablet')
        form = data.get('form', 'Tablet')
        instructions = data.get('instructions', '')
        total_quantity = int(data.get('total_quantity', 30))
        refill_threshold = int(data.get('refill_threshold', 5))
        snooze_interval_minutes = int(data.get('snooze_interval_minutes', data.get('snooze_interval', 10)))
        if snooze_interval_minutes <= 0:
            snooze_interval_minutes = 10
        patient_id = int(data.get('patient_id', 1))
        scheduled_time = data.get('scheduled_time', '08:00')

        qr_code = f"MEDICARE:{patient_id}:{name}:{dosage}:{form}"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO medicines (patient_id, name, dosage, form, instructions, start_date, total_quantity, remaining_quantity, refill_threshold, snooze_interval_minutes, qr_code_data)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (patient_id, name, dosage, form, instructions, date.today().isoformat(), total_quantity, total_quantity, refill_threshold, snooze_interval_minutes, qr_code))
        new_med_id = cursor.lastrowid

        cursor.execute("""
            INSERT INTO medicine_schedules (medicine_id, scheduled_time, frequency_type)
            VALUES (?, ?, 'Daily')
        """, (new_med_id, scheduled_time))
        conn.commit()
        conn.close()

        if request.form:
            flash(f"Medicine '{name}' registered with {snooze_interval_minutes}-minute snooze reminder!", "success")
            return redirect(request.referrer or url_for('medications_view'))
        return jsonify({"status": "created", "medicine_id": new_med_id, "name": name, "snooze_interval_minutes": snooze_interval_minutes})

    patient_id = request.args.get('patient_id', 1, type=int)
    conn = get_connection()
    medicines = conn.execute("SELECT * FROM medicines WHERE patient_id = ?", (patient_id,)).fetchall()
    conn.close()
    return jsonify([dict(m) for m in medicines])

@app.route('/api/medicines/<int:medicine_id>/snooze-interval', methods=['POST', 'PUT'])
@app.route('/api/medicines/<int:medicine_id>/update-snooze', methods=['POST'])
def api_update_snooze_interval(medicine_id):
    data = get_request_data()
    snooze_interval = int(data.get('snooze_interval_minutes', data.get('snooze_interval', 10)))
    if snooze_interval <= 0:
        snooze_interval = 10

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("UPDATE medicines SET snooze_interval_minutes = ? WHERE medicine_id = ?", (snooze_interval, medicine_id))
    med = cursor.execute("SELECT name FROM medicines WHERE medicine_id = ?", (medicine_id,)).fetchone()
    conn.commit()
    conn.close()

    med_name = med['name'] if med else "Medication"
    if request.form:
        flash(f"Custom snooze interval for {med_name} updated to {snooze_interval} minutes!", "success")
        return redirect(request.referrer or url_for('medications_view'))
    return jsonify({"status": "updated", "medicine_id": medicine_id, "snooze_interval_minutes": snooze_interval})

@app.route('/api/medicines/<int:medicine_id>', methods=['DELETE'])
@app.route('/api/medicines/<int:medicine_id>/delete', methods=['POST', 'DELETE'])
def api_delete_medicine(medicine_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM medicines WHERE medicine_id = ?", (medicine_id,))
    cursor.execute("DELETE FROM medicine_schedules WHERE medicine_id = ?", (medicine_id,))
    cursor.execute("DELETE FROM dose_records WHERE medicine_id = ?", (medicine_id,))
    cursor.execute("DELETE FROM refill_notifications WHERE medicine_id = ?", (medicine_id,))
    conn.commit()
    conn.close()

    if request.form:
        flash("Medication removed successfully!", "success")
        return redirect(request.referrer or url_for('medications_view'))
    return jsonify({"status": "deleted", "medicine_id": medicine_id})

@app.route('/api/prescriptions', methods=['GET', 'POST'])
def api_prescriptions():
    if request.method == 'POST':
        data = get_request_data()
        doctor_name = data.get('doctor_name', 'Dr. Sarah Chen, MD')
        clinic_name = data.get('clinic_name', 'Metro Medical Clinic')
        patient_id = int(data.get('patient_id', 1))
        notes = data.get('notes', '')

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT INTO prescriptions (patient_id, doctor_name, clinic_name, prescription_date, notes)
            VALUES (?, ?, ?, ?, ?)
        """, (patient_id, doctor_name, clinic_name, date.today().isoformat(), notes))
        conn.commit()
        conn.close()

        if request.form:
            flash("Prescription successfully recorded!", "success")
            return redirect(request.referrer or url_for('prescriptions_view'))
        return jsonify({"status": "created"})

    patient_id = request.args.get('patient_id', 1, type=int)
    conn = get_connection()
    prescriptions = conn.execute("SELECT * FROM prescriptions WHERE patient_id = ?", (patient_id,)).fetchall()
    conn.close()
    return jsonify([dict(p) for p in prescriptions])

@app.route('/api/predict-risk', methods=['POST'])
def api_predict_risk():
    data = get_request_data()
    result = calculate_missed_risk(data)
    return jsonify(result)

@app.route('/api/adherence-30days/<int:patient_id>', methods=['GET'])
def api_adherence_30days(patient_id):
    """Returns 30-day daily adherence data for D3.js chart visualization."""
    conn = get_connection()
    today = date.today()
    points = []
    
    for i in range(29, -1, -1):
        target_day = today - timedelta(days=i)
        day_str = target_day.isoformat()
        display_str = target_day.strftime("%b %d")
        dow_str = target_day.strftime("%a")

        records = conn.execute("""
            SELECT status FROM dose_records
            WHERE patient_id = ? AND date(scheduled_datetime) = ?
        """, (patient_id, day_str)).fetchall()

        scheduled = len(records)
        taken = sum(1 for r in records if r['status'] in ('TAKEN', 'TAKEN_LATE'))
        missed = sum(1 for r in records if r['status'] == 'MISSED')
        skipped = sum(1 for r in records if r['status'] == 'SKIPPED')

        if scheduled == 0:
            score = 100.0
            scheduled_mock = 2 if dow_str in ('Sat', 'Sun') else 3
            taken_mock = scheduled_mock
        else:
            score = round((taken / scheduled) * 100.0, 1)
            scheduled_mock = scheduled
            taken_mock = taken

        points.append({
            "date": day_str,
            "display_date": display_str,
            "adherence_score": score,
            "scheduled_doses": scheduled_mock,
            "taken_doses": taken_mock,
            "missed_doses": missed,
            "skipped_doses": skipped,
            "day_of_week": dow_str
        })
    
    conn.close()
    return jsonify(points)

# ----------------------------------------------------
# Application Health Check
# ----------------------------------------------------
@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "system": "MediCare+ Smart Medication Management System",
        "python_framework": "Flask 3.0",
        "engine": "Python 3.10+ / SQLite 3 Database Bridge Active",
        "timestamp": datetime.now().isoformat()
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    if HAS_FLASK and app is not None:
        app.run(host='0.0.0.0', port=port, debug=True)
    else:
        from python_server import run_server
        print(f"Flask not found. Launching MediCare+ Pure Python Engine on port {port}...")
        run_server(port=port)
