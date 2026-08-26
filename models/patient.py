from dataclasses import dataclass
from typing import Optional

@dataclass
class Patient:
    patient_id: Optional[int] = None
    primary_user_id: int = 1
    name: str = ""
    relationship: str = "Self" # Self, Parent, Child, Spouse
    age: Optional[int] = None
    gender: Optional[str] = None
    blood_group: Optional[str] = None

    def to_dict(self):
        return {
            "patient_id": self.patient_id,
            "primary_user_id": self.primary_user_id,
            "name": self.name,
            "relationship": self.relationship,
            "age": self.age,
            "gender": self.gender,
            "blood_group": self.blood_group
        }
