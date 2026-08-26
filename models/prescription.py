from dataclasses import dataclass
from typing import Optional

@dataclass
class Prescription:
    prescription_id: Optional[int] = None
    patient_id: int = 1
    doctor_name: str = ""
    prescription_date: str = ""
    notes: str = ""
    file_path: Optional[str] = None

    def to_dict(self):
        return {
            "prescription_id": self.prescription_id,
            "patient_id": self.patient_id,
            "doctor_name": self.doctor_name,
            "prescription_date": self.prescription_date,
            "notes": self.notes,
            "file_path": self.file_path
        }
