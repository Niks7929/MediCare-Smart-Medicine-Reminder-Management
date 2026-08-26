from dataclasses import dataclass
from typing import Optional

@dataclass
class MedicineSchedule:
    schedule_id: Optional[int] = None
    medicine_id: int = 1
    scheduled_time: str = "08:00:00"
    frequency_type: str = "Daily" # 'Daily', 'Twice Daily', 'Custom'
    days_of_week: str = "Mon,Tue,Wed,Thu,Fri,Sat,Sun"
    is_active: bool = True

    def to_dict(self):
        return {
            "schedule_id": self.schedule_id,
            "medicine_id": self.medicine_id,
            "scheduled_time": self.scheduled_time,
            "frequency_type": self.frequency_type,
            "days_of_week": self.days_of_week,
            "is_active": self.is_active
        }
