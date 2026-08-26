from dataclasses import dataclass
from typing import Optional

@dataclass
class Medicine:
    medicine_id: Optional[int] = None
    patient_id: int = 1
    name: str = ""
    dosage: str = "1 tablet"
    form: str = "Tablet"
    instructions: str = ""
    start_date: str = ""
    end_date: Optional[str] = None
    total_quantity: int = 30
    remaining_quantity: int = 30
    refill_threshold: int = 5
    qr_code_data: Optional[str] = None

    def days_remaining(self, daily_dose_count: int = 2) -> float:
        if daily_dose_count <= 0:
            return 999.0
        return round(self.remaining_quantity / daily_dose_count, 1)

    def is_refill_needed(self, daily_dose_count: int = 2) -> bool:
        return self.remaining_quantity <= self.refill_threshold

    def to_dict(self):
        return {
            "medicine_id": self.medicine_id,
            "patient_id": self.patient_id,
            "name": self.name,
            "dosage": self.dosage,
            "form": self.form,
            "instructions": self.instructions,
            "start_date": self.start_date,
            "end_date": self.end_date,
            "total_quantity": self.total_quantity,
            "remaining_quantity": self.remaining_quantity,
            "refill_threshold": self.refill_threshold,
            "qr_code_data": self.qr_code_data or f"MEDICARE:{self.medicine_id}:{self.name}"
        }
