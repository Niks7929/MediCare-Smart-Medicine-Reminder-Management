"""
MediCare+ Caregiver Model
"""
import sqlite3
from typing import List, Dict, Optional

class CaregiverModel:
    @staticmethod
    def get_by_patient(db_path: str, patient_id: int) -> List[Dict]:
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT * FROM caregivers 
            WHERE patient_id = ?
            ORDER BY created_at DESC
        """, (patient_id,))
        
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]

    @staticmethod
    def create(db_path: str, data: Dict) -> int:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO caregivers (patient_id, name, relation, phone, email, notify_on_missed, notify_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            data.get('patient_id'),
            data.get('name'),
            data.get('relation'),
            data.get('phone'),
            data.get('email'),
            1 if data.get('notify_on_missed', True) else 0,
            data.get('notify_threshold', 2)
        ))
        
        new_id = cursor.lastrowid
        conn.commit()
        conn.close()
        return new_id

    @staticmethod
    def delete(db_path: str, caregiver_id: int) -> bool:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        cursor.execute("DELETE FROM caregivers WHERE caregiver_id = ?", (caregiver_id,))
        success = cursor.rowcount > 0
        conn.commit()
        conn.close()
        return success
