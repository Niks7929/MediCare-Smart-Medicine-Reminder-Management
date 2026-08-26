from dataclasses import dataclass
from datetime import datetime
from typing import Optional

@dataclass
class DoseRecord:
    dose_id: Optional[int] = None
    medicine_id: int = 1
    patient_id: int = 1
    scheduled_datetime: str = ""
    actual_datetime: Optional[str] = None
    status: str = "PENDING" # TAKEN, MISSED, SKIPPED, TAKEN_LATE, PENDING
    snooze_count: int = 0
    snooze_minutes: int = 0
    missed_reason: Optional[str] = None

    def to_dict(self):
        return {
            "dose_id": self.dose_id,
            "medicine_id": self.medicine_id,
            "patient_id": self.patient_id,
            "scheduled_datetime": self.scheduled_datetime,
            "actual_datetime": self.actual_datetime,
            "status": self.status,
            "snooze_count": self.snooze_count,
            "snooze_minutes": self.snooze_minutes,
            "missed_reason": self.missed_reason
        }
