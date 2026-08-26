"""
MediCare+ — Standalone Pure Python HTTP & REST API Server (Zero External Dependencies)
Powered by Python standard library: http.server, sqlite3, json, urllib.parse, hashlib, datetime.
"""

import os
import sys
import io
import csv
import json
import sqlite3
import hashlib
from datetime import datetime, date, timedelta
from urllib.parse import urlparse, parse_qs
from http.server import HTTPServer, BaseHTTPRequestHandler

# Import local modules
sys.path.insert(0, os.path.dirname(__file__))
from config import Config
from database.db import get_connection, initialize_database, hash_password
from ml.adherence_prediction import calculate_missed_risk

# Ensure database is initialized
initialize_database()

PORT = int(os.environ.get('PORT', 5000))
HOST = "0.0.0.0"

def parse_body(handler):
    content_len = int(handler.headers.get('Content-Length', 0))
    if content_len > 0:
        raw_body = handler.rfile.read(content_len).decode('utf-8')
        try:
            return json.loads(raw_body)
        except Exception:
            try:
                parsed = parse_qs(raw_body)
                return {k: v[0] for k, v in parsed.items()}
            except Exception:
                return {}
    return {}

class MediCareHTTPHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_html(self, html_content, status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(html_content.encode('utf-8'))

    def _send_csv(self, csv_content, filename="dose_compliance.csv", status_code=200):
        self.send_response(status_code)
        self.send_header('Content-Type', 'text/csv; charset=utf-8')
        self.send_header('Content-Disposition', f'attachment; filename="{filename}"')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(csv_content.encode('utf-8'))

    def _send_static(self, filepath, content_type='text/css'):
        if os.path.exists(filepath):
            self.send_response(200)
            self.send_header('Content-Type', content_type)
            self.end_headers()
            with open(filepath, 'rb') as f:
                self.wfile.write(f.read())
        else:
            self.send_response(404)
            self.end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.end_headers()

    def do_GET(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        query = parse_qs(parsed_url.query)

        # Health Check
        if path == '/api/health':
            self._send_json({
                "status": "online",
                "system": "MediCare+ Pure Python Engine",
                "runtime": f"Python {sys.version.split()[0]}",
                "database": "SQLite3 Standalone",
                "timestamp": datetime.now().isoformat()
            })
            return

        # API: Medications
        if path == '/api/medications':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            rows = conn.execute("""
                SELECT m.*, 
                       (SELECT GROUP_CONCAT(scheduled_time || '|' || frequency_type, ';') 
                        FROM medicine_schedules WHERE medicine_id = m.medicine_id) as schedules_raw
                FROM medicines m
                WHERE m.patient_id = ?
                ORDER BY m.medicine_id ASC
            """, (patient_id,)).fetchall()
            
            meds = []
            for r in rows:
                d = dict(r)
                schedules = []
                if d.get('schedules_raw'):
                    for item in d['schedules_raw'].split(';'):
                        if '|' in item:
                            t, f = item.split('|', 1)
                            schedules.append({"time": t, "frequency": f})
                if not schedules:
                    schedules = [{"time": "08:00:00", "frequency": "Daily"}]
                d['schedules'] = schedules
                d['snooze_interval_minutes'] = d.get('snooze_interval_minutes') or 10
                d['needs_refill'] = d['remaining_quantity'] <= d['refill_threshold']
                meds.append(d)
            conn.close()
            self._send_json(meds)
            return

        # API: Dose Records
        if path == '/api/dose-records':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            rows = conn.execute("""
                SELECT d.*, m.name as medicine_name, m.dosage, m.form
                FROM dose_records d
                JOIN medicines m ON d.medicine_id = m.medicine_id
                WHERE d.patient_id = ?
                ORDER BY d.scheduled_datetime DESC
            """, (patient_id,)).fetchall()
            conn.close()
            self._send_json([dict(r) for r in rows])
            return

        # CSV Export for Dose Compliance History
        if path.startswith('/export-dose-history-csv/') or path == '/api/dose-history/csv':
            if path.startswith('/export-dose-history-csv/'):
                try:
                    patient_id = int(path.split('/')[2])
                except Exception:
                    patient_id = 1
            else:
                patient_id = int(query.get('patient_id', [1])[0])

            filter_status = query.get('status', ['ALL'])[0]
            search_query = query.get('q', [''])[0].strip()

            conn = get_connection()
            patient_row = conn.execute("SELECT * FROM patients WHERE patient_id = ?", (patient_id,)).fetchone()
            patient_name = patient_row['name'] if patient_row else f"Patient_{patient_id}"

            sql = """
                SELECT d.*, m.name as medicine_name, m.dosage, m.form, m.instructions
                FROM dose_records d
                JOIN medicines m ON d.medicine_id = m.medicine_id
                WHERE d.patient_id = ?
            """
            params = [patient_id]
            if filter_status == 'TAKEN':
                sql += " AND d.status IN ('TAKEN', 'TAKEN_LATE')"
            elif filter_status == 'MISSED':
                sql += " AND d.status IN ('MISSED', 'SKIPPED')"

            if search_query:
                sql += " AND m.name LIKE ?"
                params.append(f"%{search_query}%")

            sql += " ORDER BY d.scheduled_datetime DESC"
            records = conn.execute(sql, tuple(params)).fetchall()
            conn.close()

            output = io.StringIO()
            writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
            writer.writerow(["# MediCare+ Dose Compliance & Intake Audit Export"])
            writer.writerow([f"# Patient: {patient_name} (Patient ID: {patient_id})"])
            writer.writerow([f"# Export Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"])
            writer.writerow([f"# Filter Applied: {filter_status}"])
            writer.writerow([f"# Total Records: {len(records)}"])
            writer.writerow([])

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

            csv_text = output.getvalue()
            output.close()

            safe_name = "".join(c if c.isalnum() else "_" for c in patient_name.lower())
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"dose_compliance_{safe_name}_{timestamp}.csv"

            self._send_csv(csv_text, filename=filename)
            return

        # API: Caregivers
        if path == '/api/caregivers':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            rows = conn.execute("SELECT * FROM caregivers WHERE patient_id = ?", (patient_id,)).fetchall()
            conn.close()
            self._send_json([dict(r) for r in rows])
            return

        # API: Prescriptions
        if path == '/api/prescriptions':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            rows = conn.execute("SELECT * FROM prescriptions WHERE patient_id = ? ORDER BY prescription_date DESC", (patient_id,)).fetchall()
            conn.close()
            self._send_json([dict(r) for r in rows])
            return

        # API: Adherence Risk Prediction
        if path == '/api/adherence/prediction':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            records = conn.execute("SELECT status, snooze_count FROM dose_records WHERE patient_id = ?", (patient_id,)).fetchall()
            conn.close()
            
            total = len(records)
            taken = sum(1 for r in records if r['status'] in ('TAKEN', 'TAKEN_LATE'))
            snooze_total = sum(r['snooze_count'] or 0 for r in records)
            adherence = (taken / total) if total > 0 else 0.85

            input_data = {
                "scheduled_hour": datetime.now().hour,
                "day_of_week": datetime.now().weekday(),
                "historical_adherence": round(adherence, 2),
                "snooze_count": snooze_total,
                "past_missed_doses": total - taken
            }
            prediction = calculate_missed_risk(input_data)
            self._send_json(prediction)
            return

        # API: Weekly Adherence Trend
        if path == '/api/adherence/weekly-trend':
            patient_id = int(query.get('patient_id', [1])[0])
            conn = get_connection()
            today = date.today()
            points = []
            for i in range(6, -1, -1):
                target = today - timedelta(days=i)
                day_str = target.isoformat()
                recs = conn.execute("SELECT status FROM dose_records WHERE patient_id = ? AND date(scheduled_datetime) = ?", (patient_id, day_str)).fetchall()
                sched = len(recs)
                tkn = sum(1 for r in recs if r['status'] in ('TAKEN', 'TAKEN_LATE'))
                miss = sum(1 for r in recs if r['status'] == 'MISSED')
                points.append({
                    "date": day_str,
                    "display_date": target.strftime("%b %d"),
                    "day_of_week": target.strftime("%a"),
                    "adherence_score": round((tkn / sched * 100.0), 1) if sched > 0 else 100.0,
                    "scheduled_doses": sched or 2,
                    "taken_doses": tkn if sched > 0 else 2,
                    "missed_doses": miss
                })
            conn.close()
            self._send_json(points)
            return

        # Static files & Templates Fallback
        if path.startswith('/static/'):
            filepath = os.path.join(os.path.dirname(__file__), path.lstrip('/'))
            ct = 'text/css' if path.endswith('.css') else 'application/javascript' if path.endswith('.js') else 'text/plain'
            self._send_static(filepath, ct)
            return

        # Serve index template if requested
        template_file = 'index.html' if path in ('/', '/index.html') else path.lstrip('/') + '.html'
        tpl_path = os.path.join(os.path.dirname(__file__), 'templates', template_file)
        if os.path.exists(tpl_path):
            with open(tpl_path, 'r', encoding='utf-8') as f:
                content = f.read()
            self._send_html(content)
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_POST(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path
        body = parse_body(self)

        # Log Dose
        if path == '/api/medications/log-dose':
            medicine_id = int(body.get('medicine_id', 1))
            patient_id = int(body.get('patient_id', 1))
            status = body.get('status', 'TAKEN')
            missed_reason = body.get('missed_reason')
            now_iso = datetime.now().isoformat()

            conn = get_connection()
            conn.execute("""
                INSERT INTO dose_records (medicine_id, patient_id, scheduled_datetime, actual_datetime, status, missed_reason)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (medicine_id, patient_id, now_iso, now_iso if status == 'TAKEN' else None, status, missed_reason))

            if status == 'TAKEN':
                conn.execute("UPDATE medicines SET remaining_quantity = MAX(0, remaining_quantity - 1) WHERE medicine_id = ?", (medicine_id,))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "message": f"Dose logged as {status}"})
            return

        # Update User/Patient Name
        if path == '/api/patient/update-name':
            new_name = body.get('name', '').strip()
            user_id = int(body.get('user_id', 1))
            patient_id = int(body.get('patient_id', 1))
            if new_name:
                conn = get_connection()
                conn.execute("UPDATE users SET full_name = ? WHERE user_id = ?", (new_name, user_id))
                conn.execute("UPDATE patients SET name = ? WHERE patient_id = ?", (new_name, patient_id))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "name": new_name})
            else:
                self._send_json({"error": "Name cannot be empty"}, 400)
            return

        # Add Medication
        if path == '/api/medications':
            patient_id = int(body.get('patient_id', 1))
            name = body.get('name', 'New Medicine')
            dosage = body.get('dosage', '1 tablet')
            form = body.get('form', 'Tablet')
            instructions = body.get('instructions', '')
            total_qty = int(body.get('total_quantity', 30))
            refill_thresh = int(body.get('refill_threshold', 5))
            snooze_interval = int(body.get('snooze_interval_minutes', body.get('snooze_interval', 10)))
            if snooze_interval <= 0:
                snooze_interval = 10
            today_str = date.today().isoformat()
            qr_data = f"MEDICARE:{name}:{dosage}:{form}"

            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO medicines (patient_id, name, dosage, form, instructions, start_date, total_quantity, remaining_quantity, refill_threshold, snooze_interval_minutes, qr_code_data)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (patient_id, name, dosage, form, instructions, today_str, total_qty, total_qty, refill_thresh, snooze_interval, qr_data))
            new_med_id = cursor.lastrowid

            schedules = body.get('schedules', [{"time": "08:00:00", "frequency": "Daily"}])
            for s in schedules:
                cursor.execute("""
                    INSERT INTO medicine_schedules (medicine_id, scheduled_time, frequency_type, days_of_week)
                    VALUES (?, ?, ?, ?)
                """, (new_med_id, s.get('time', '08:00:00'), s.get('frequency', 'Daily'), 'Mon,Tue,Wed,Thu,Fri,Sat,Sun'))

            conn.commit()
            conn.close()
            self._send_json({"success": True, "medicine_id": new_med_id, "name": name, "snooze_interval_minutes": snooze_interval}, 201)
            return

        # Update Medication Snooze Interval
        if '/snooze-interval' in path or path == '/api/medicines/snooze-interval':
            med_id = None
            if path.startswith('/api/medicines/') or path.startswith('/api/medications/'):
                parts = path.split('/')
                try:
                    med_id = int(parts[3])
                except Exception:
                    med_id = int(body.get('medicine_id', 1))
            else:
                med_id = int(body.get('medicine_id', 1))

            snooze_interval = int(body.get('snooze_interval_minutes', body.get('snooze_interval', 10)))
            if snooze_interval <= 0:
                snooze_interval = 10

            conn = get_connection()
            conn.execute("UPDATE medicines SET snooze_interval_minutes = ? WHERE medicine_id = ?", (snooze_interval, med_id))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "medicine_id": med_id, "snooze_interval_minutes": snooze_interval})
            return

        # Refill Request
        if path == '/api/medications/refill':
            medicine_id = int(body.get('medicine_id', 1))
            patient_id = int(body.get('patient_id', 1))
            req_qty = int(body.get('quantity', 30))

            conn = get_connection()
            cursor = conn.cursor()
            med = cursor.execute("SELECT name FROM medicines WHERE medicine_id = ?", (medicine_id,)).fetchone()
            med_name = med['name'] if med else "Prescribed Medication"
            
            cursor.execute("""
                INSERT INTO refill_notifications (medicine_id, patient_id, requested_quantity, message, channel)
                VALUES (?, ?, ?, ?, ?)
            """, (medicine_id, patient_id, req_qty, f"Refill requested for {med_name} ({req_qty} units)", "SMS_AND_EMAIL"))
            conn.commit()
            conn.close()
            self._send_json({"success": True, "message": f"Refill requested for {med_name}"})
            return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not Found")

    def do_DELETE(self):
        parsed_url = urlparse(self.path)
        path = parsed_url.path

        # Delete Patient
        if path.startswith('/api/patients/'):
            try:
                patient_id = int(path.split('/')[-1])
                conn = get_connection()
                conn.execute("DELETE FROM refill_notifications WHERE patient_id = ?", (patient_id,))
                conn.execute("DELETE FROM prescriptions WHERE patient_id = ?", (patient_id,))
                conn.execute("DELETE FROM caregivers WHERE patient_id = ?", (patient_id,))
                conn.execute("DELETE FROM dose_records WHERE patient_id = ?", (patient_id,))
                conn.execute("DELETE FROM medicine_schedules WHERE medicine_id IN (SELECT medicine_id FROM medicines WHERE patient_id = ?)", (patient_id,))
                conn.execute("DELETE FROM medicines WHERE patient_id = ?", (patient_id,))
                conn.execute("DELETE FROM patients WHERE patient_id = ?", (patient_id,))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "message": "Patient and clinical records deleted"})
                return
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
                return

        # Delete Medicine
        if path.startswith('/api/medicines/'):
            try:
                med_id = int(path.split('/')[-1])
                conn = get_connection()
                conn.execute("DELETE FROM refill_notifications WHERE medicine_id = ?", (med_id,))
                conn.execute("DELETE FROM dose_records WHERE medicine_id = ?", (med_id,))
                conn.execute("DELETE FROM medicine_schedules WHERE medicine_id = ?", (med_id,))
                conn.execute("DELETE FROM medicines WHERE medicine_id = ?", (med_id,))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "message": "Medicine deleted"})
                return
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
                return

        # Delete Prescription
        if path.startswith('/api/prescriptions/'):
            try:
                rx_id = int(path.split('/')[-1])
                conn = get_connection()
                conn.execute("DELETE FROM prescriptions WHERE prescription_id = ?", (rx_id,))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "message": "Prescription deleted"})
                return
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
                return

        # Delete Caregiver
        if path.startswith('/api/caregivers/'):
            try:
                cg_id = int(path.split('/')[-1])
                conn = get_connection()
                conn.execute("DELETE FROM caregivers WHERE caregiver_id = ?", (cg_id,))
                conn.commit()
                conn.close()
                self._send_json({"success": True, "message": "Caregiver deleted"})
                return
            except Exception as e:
                self._send_json({"error": str(e)}, 500)
                return

        self.send_response(404)
        self.end_headers()
        self.wfile.write(b"Not Found")

def run_server(port=PORT):
    server_address = (HOST, port)
    httpd = HTTPServer(server_address, MediCareHTTPHandler)
    print(f"MediCare+ Pure Python HTTP Server running on http://{HOST}:{port}")
    httpd.serve_forever()

if __name__ == '__main__':
    run_server()
